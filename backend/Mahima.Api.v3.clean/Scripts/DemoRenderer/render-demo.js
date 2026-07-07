const fs = require("fs/promises");
const fss = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, ...options });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr?.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited ${code}\n${stdout}\n${stderr}`));
    });
  });
}

function runShell(command) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { shell: true });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr?.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited ${code}\n${stdout}\n${stderr}`));
    });
  });
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function commandExists(command, versionArgs = ["--version"]) {
  try {
    await run(command, versionArgs);
    return true;
  } catch {
    return false;
  }
}

function buildAppUrl(routePath, appBaseUrl) {
  const base = String(appBaseUrl || "").replace(/\/+$/, "");
  const raw = String(routePath || "/home");
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("#")) return `${base}/${raw}`;
  if (raw.startsWith("/#")) return `${base}${raw}`;
  const clean = raw.startsWith("/") ? raw : `/${raw}`;
  return `${base}/#${clean}`;
}

function sameHashRoute(currentUrl, expectedUrl) {
  try {
    const current = new URL(currentUrl);
    const expected = new URL(expectedUrl);
    if (expected.hash) return current.hash === expected.hash;
    return current.pathname === expected.pathname;
  } catch {
    return true;
  }
}

function langVoice(lang) {
  if (lang === "hi") return "hi";
  if (lang === "pa") return "pa";
  return "en";
}

async function createSilentAudio(ffmpeg, output, seconds) {
  await run(ffmpeg, [
    "-y",
    "-f", "lavfi",
    "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-t", String(seconds),
    "-acodec", "pcm_s16le",
    output,
  ]);
}



async function createOpenAiSpeech(text, output, voiceConfig = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("OpenAI speech skipped: OPENAI_API_KEY is not set.");
    return false;
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
  const voice = voiceConfig.ttsVoice || "nova";
  const instructions = voiceConfig.ttsInstructions || process.env.OPENAI_TTS_INSTRUCTIONS || "Speak like a real Indian male presenter from North India. Use warm Indian English pronunciation with natural pauses, gentle confidence, and a ministry-demo tone. Do not sound robotic or synthetic.";

  console.log(`Invoking OpenAI speech. Model=${model}, Voice=${voice}, Instructions=${instructions.slice(0, 90)}`);
  const response = await fetch(`${baseUrl}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      voice,
      input: text,
      instructions,
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`OpenAI speech failed: ${response.status} ${body}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(output, buffer);
  return true;
}

async function createNarrationAudio(text, lang, output, ffmpeg, voiceConfig = {}) {
  const template = process.env.DEMO_TTS_COMMAND;
  const voice = voiceConfig.ttsVoice || langVoice(lang);
  const requireOpenAiSpeech = Boolean(voiceConfig.requireOpenAiSpeech) || process.env.REQUIRE_OPENAI_SPEECH === "1";

  try {
    if (await createOpenAiSpeech(text, output, voiceConfig)) return;
  } catch (error) {
    if (requireOpenAiSpeech) throw error;
    console.warn(error.message || error);
  }

  if (requireOpenAiSpeech) {
    throw new Error("OpenAI speech is required for this render, but OPENAI_API_KEY is not configured or the speech request failed.");
  }
  if (template) {
    const command = template
      .replaceAll("{text}", shellQuote(text))
      .replaceAll("{output}", shellQuote(output))
      .replaceAll("{lang}", shellQuote(lang))
      .replaceAll("{voice}", shellQuote(voice))
      .replaceAll("{voiceKey}", shellQuote(voiceConfig.voiceKey || "default"));
    await runShell(command);
    if (await fileExists(output)) return;
  }

  if (await commandExists("espeak-ng")) {
    try {
      await run("espeak-ng", ["-v", voice, "-s", "145", "-w", output, text]);
      return;
    } catch {
      await run("espeak-ng", ["-v", "en", "-s", "145", "-w", output, text]);
      return;
    }
  }

  if (await commandExists("espeak")) {
    try {
      await run("espeak", ["-v", voice, "-s", "145", "-w", output, text]);
      return;
    } catch {
      await run("espeak", ["-v", "en", "-s", "145", "-w", output, text]);
      return;
    }
  }

  console.warn("No TTS command found; using silent audio. Install espeak-ng or set ProjectDemo:TtsCommand.");
  await createSilentAudio(ffmpeg, output, 6);
}

async function audioDuration(ffprobe, file, minimumSeconds = 6) {
  try {
    const result = await run(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file]);
    const seconds = Number.parseFloat(result.stdout.trim());
    const minimum = Number.isFinite(Number(minimumSeconds)) ? Number(minimumSeconds) : 6;
    return Number.isFinite(seconds) && seconds > 1 ? Math.min(Math.max(seconds + 0.75, minimum), 24) : minimum;
  } catch {
    return Number.isFinite(Number(minimumSeconds)) ? Number(minimumSeconds) : 6;
  }
}

async function captureUploadedScreenshots(routes, screenshotsDir) {
  const captured = [];
  for (let i = 0; i < routes.length; i += 1) {
    const route = routes[i];
    const source = route.uploadedImagePath;
    if (!source) return null;
    if (!(await fileExists(source))) throw new Error(`Uploaded screenshot is missing: ${source}`);
    const target = path.join(screenshotsDir, route.screenshotName || `${String(i + 1).padStart(2, "0")}${path.extname(source) || ".png"}`);
    await fs.copyFile(source, target);
    captured.push({ ...route, screenshotPath: target });
  }
  return captured;
}

async function captureScreenshots(payload, screenshotsDir) {
  const routes = payload.job.captureRoutes || [];
  const uploaded = await captureUploadedScreenshots(routes, screenshotsDir);
  if (uploaded) return uploaded;

  let chromium;
  try {
    chromium = require("playwright").chromium;
  } catch (error) {
    throw new Error("Playwright is not installed. Run: cd backend/Mahima.Api.v3.clean/Scripts/DemoRenderer && npm install && npx playwright install chromium");
  }

  const launchOptions = { headless: true };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }

  let browser;
  try {
    browser = await chromium.launch(launchOptions);
  } catch (error) {
    throw new Error(`${error.message}\n\nFix on server:\n  cd /var/www/mahima-api/Scripts/DemoRenderer\n  HOME=/var/www XDG_CACHE_HOME=/var/www/.cache npx playwright install chromium\n\nAlternative: install system chromium and set ProjectDemo:ChromiumExecutablePath.`);
  }
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
  });

  await context.addInitScript((token) => {
    const cleanToken = String(token || "").replace(/^Bearer\s+/i, "").trim();
    window.localStorage.setItem("mahima_token", cleanToken);
    window.localStorage.setItem("authToken", cleanToken);
    window.localStorage.setItem("auth_token", cleanToken);
    window.localStorage.setItem("token", cleanToken);
    const demoUser = JSON.stringify({
      token: cleanToken,
      accessToken: cleanToken,
      username: "Demo Renderer",
      displayName: "Demo Renderer",
      role: "admin",
      pages: ["APP_DOWNLOADS", "PASTOR", "SERMONS", "PRAYER_REQUESTS", "TASKS", "PROJECT_MANAGEMENT", "USERS", "TEAMS", "ROLES", "POSITIONS", "ATTENDANCE", "PAYROLL", "COSTS", "MARRIAGE", "BAPTISM", "COUNSELLING", "PAGES", "REPORTS"]
    });
    ["mahima_user", "me", "currentUser", "mahima_currentUser", "user", "mahima:user"].forEach((key) => {
      if (!window.localStorage.getItem(key)) window.localStorage.setItem(key, demoUser);
    });
  }, payload.authToken);

  const page = await context.newPage();
  const captured = [];

  for (let i = 0; i < routes.length; i += 1) {
    const route = routes[i];
    const url = buildAppUrl(route.path || "/home", payload.appBaseUrl);
    const file = path.join(screenshotsDir, route.screenshotName || `${String(i + 1).padStart(2, "0")}.png`);
    console.log(`Capturing ${url}`);
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    } catch {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    }
    await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
    await page.waitForSelector("#root", { timeout: 15000 }).catch(() => {});
    const waitMs = Number(route.waitMs || 2400);
    await page.waitForTimeout(Number.isFinite(waitMs) ? waitMs : 2400);
    if (!sameHashRoute(page.url(), url)) {
      console.warn(`Route ${route.title || route.path} captured at ${page.url()} instead of ${url}`);
    }
    await page.screenshot({ path: file, fullPage: false });
    captured.push({ ...route, screenshotPath: file });
  }

  await browser.close();
  return captured;
}

async function createSegment(ffmpeg, ffprobe, route, index, lang, audioDir, segmentsDir, voiceConfig = {}) {
  const text = route.narration || route.title || "Mahima Application Demo";
  const audioExtension = process.env.OPENAI_API_KEY ? "mp3" : "wav";
  const audio = path.join(audioDir, `${String(index + 1).padStart(2, "0")}.${audioExtension}`);
  const segment = path.join(segmentsDir, `${String(index + 1).padStart(2, "0")}.mp4`);
  await createNarrationAudio(text, lang, audio, ffmpeg, voiceConfig);
  const duration = await audioDuration(ffprobe, audio, route.durationSeconds || 6);

  await run(ffmpeg, [
    "-y",
    "-loop", "1",
    "-t", String(duration),
    "-i", route.screenshotPath,
    "-i", audio,
    "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-r", String(30),
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-shortest",
    segment,
  ]);

  return segment;
}

async function main() {
  const payloadPath = process.argv[2];
  if (!payloadPath) throw new Error("Usage: node render-demo.js <payload.json>");

  const payloadText = (await fs.readFile(payloadPath, "utf8")).replace(/^\uFEFF/, "");
  const payload = JSON.parse(payloadText);
  const outputRoot = payload.outputRoot || process.env.DEMO_RENDER_OUTPUT_ROOT || process.cwd();
  const screenshotsDir = path.join(outputRoot, "screenshots");
  const audioDir = path.join(outputRoot, "audio");
  const segmentsDir = path.join(outputRoot, "segments");
  await fs.mkdir(screenshotsDir, { recursive: true });
  await fs.mkdir(audioDir, { recursive: true });
  await fs.mkdir(segmentsDir, { recursive: true });

  const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
  const ffprobe = process.env.FFPROBE_PATH || "ffprobe";
  if (!(await commandExists(ffmpeg, ["-version"]))) throw new Error("ffmpeg was not found. Install ffmpeg or set ProjectDemo:FfmpegPath.");

  const captured = await captureScreenshots(payload, screenshotsDir);
  if (captured.length === 0) throw new Error("No capture routes were provided.");

  const voiceConfig = {
    voiceKey: payload.job.voiceKey,
    voiceLabel: payload.job.voiceLabel,
    ttsVoice: payload.job.ttsVoice,
    ttsInstructions: payload.job.ttsInstructions,
    requireOpenAiSpeech: Boolean(payload.job.requireOpenAiSpeech),
  };

  const segments = [];
  for (let i = 0; i < captured.length; i += 1) {
    segments.push(await createSegment(ffmpeg, ffprobe, captured[i], i, payload.job.language || "en", audioDir, segmentsDir, voiceConfig));
  }

  const listPath = path.join(outputRoot, "segments.txt");
  await fs.writeFile(listPath, segments.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join("\n"), "utf8");

  const outputName = payload.job.output || `mahima-app-demo-${payload.job.language || "en"}.mp4`;
  const outputPath = path.join(outputRoot, outputName);
  await run(ffmpeg, ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outputPath]);
  if (!fss.existsSync(outputPath)) throw new Error(`MP4 was not created: ${outputPath}`);
  console.log(`Created ${outputPath}`);
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
