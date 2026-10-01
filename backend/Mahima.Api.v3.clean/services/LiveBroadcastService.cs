using System.Diagnostics;
using System.Globalization;

namespace Mahima.Api.v3.clean.Services;

public sealed record BroadcastInput(
    string Id, string Name, string Url, bool Video = true, bool Audio = true,
    double Volume = 1.0, bool Muted = false, bool Denoise = true, bool SpeechLevel = false,
    double GainDb = 0, double Pan = 0, bool Gate = true, bool Compressor = true,
    bool DeEsser = true, double EqLowDb = 0, double EqMidDb = 0, double EqHighDb = 0,
    int SyncMs = 0, bool SplitStereo = false,
    string Channel1Name = "Analog 1", string Channel2Name = "Analog 2",
    double Channel1Volume = 0.8, double Channel2Volume = 0.8,
    double Channel1GainDb = 0, double Channel2GainDb = 0,
    double Channel1Pan = 0, double Channel2Pan = 0,
    bool Channel1Muted = false, bool Channel2Muted = false,
    string Kind = "live", bool Loop = false);
public sealed record BroadcastOverlay(string Type, string Value, string Position = "lower-third", string? Color = null, int FontSize = 42, double Opacity = 1.0);
public sealed record BroadcastDestination(string Name, string IngestUrl, string StreamKey, bool Enabled = true);
public sealed record BroadcastAudioMix(
    string Mode = "auto", bool HighPass = true, bool Normalize = true,
    bool Limiter = true, double TargetLufs = -16, double MasterGainDb = 0,
    int NoiseReduction = 35, bool AutoGain = true, bool LowLatency = true);
public sealed record BroadcastLocalOutput(bool Enabled = false, string Protocol = "udp", string Host = "127.0.0.1", int Port = 10000, int LatencyMs = 80);
public sealed record LiveBroadcastStartRequest(
    string? InputUrl,
    string? StreamKey,
    string? IngestUrl,
    string? Quality,
    bool CopyVideo = false,
    IReadOnlyList<BroadcastInput>? Inputs = null,
    IReadOnlyList<BroadcastOverlay>? Overlays = null,
    IReadOnlyList<BroadcastDestination>? Destinations = null,
    string Layout = "single",
    int ProgramInput = 0,
    bool Record = false,
    string? RecordingName = null,
    BroadcastAudioMix? AudioMix = null,
    BroadcastLocalOutput? LocalOutput = null);

public sealed record LiveBroadcastStatus(
    string State,
    DateTimeOffset? StartedAt,
    int? ProcessId,
    string? InputUrl,
    string? Quality,
    string? LastError,
    IReadOnlyList<string> RecentLog);
public sealed record BroadcastPreflight(bool Ready, string FfmpegPath, string? Version, IReadOnlyDictionary<string, bool> Capabilities, string? Error = null);
public sealed record LiveBroadcastSwitchRequest(int ProgramInput = 0, string Layout = "single");

public sealed class LiveBroadcastService : IDisposable
{
    private readonly object _gate = new();
    private readonly ILogger<LiveBroadcastService> _logger;
    private readonly IConfiguration _configuration;
    private readonly Queue<string> _recentLog = new();
    private readonly Queue<string> _importantLog = new();
    private readonly HashSet<string> _logSecrets = new(StringComparer.Ordinal);
    private Process? _process;
    private DateTimeOffset? _startedAt;
    private string? _inputUrl;
    private string? _quality;
    private string? _lastError;
    private string _state = "idle";
    private int _videoInputCount;
    private int[] _videoInputIndexes = [];
    private int _programInput;
    private string _layout = "single";
    private readonly int _controlPort;

    public LiveBroadcastService(ILogger<LiveBroadcastService> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
        _controlPort = Math.Clamp(configuration.GetValue("LiveBroadcast:ControlPort", 5555), 1024, 65535);
    }

    public LiveBroadcastStatus GetStatus()
    {
        lock (_gate)
        {
            if (_process is { HasExited: true } && _state is "starting" or "live")
            {
                _state = _process.ExitCode == 0 ? "stopped" : "failed";
                if (_process.ExitCode != 0 && string.IsNullOrWhiteSpace(_lastError))
                    _lastError = $"FFmpeg exited with code {_process.ExitCode}.";
            }
            return Snapshot();
        }
    }

    public LiveBroadcastStatus Start(LiveBroadcastStartRequest request)
    {
        var inputs = NormalizeInputs(request);
        var destinations = NormalizeDestinations(request);
        if (inputs.Count == 0) throw new ArgumentException("At least one video/audio input is required.");
        if (destinations.Count == 0 && !request.Record && request.LocalOutput?.Enabled != true) throw new ArgumentException("Enable YouTube, OBS/vMix output, or local recording.");

        lock (_gate)
        {
            if (_process is { HasExited: false }) throw new InvalidOperationException("A broadcast is already running.");

            var ffmpeg = _configuration["LiveBroadcast:FfmpegPath"] ?? "ffmpeg";
            var quality = NormalizeQuality(request.Quality);
            var args = BuildArguments(inputs, destinations, request.Overlays ?? [], request.Layout, request.ProgramInput, quality, request.Record, request.RecordingName, request.AudioMix ?? new(), request.LocalOutput ?? new());

            _recentLog.Clear();
            _importantLog.Clear();
            _logSecrets.Clear();
            foreach (var destination in destinations) _logSecrets.Add(destination.StreamKey.Trim());
            _lastError = null;
            _inputUrl = string.Join(", ", inputs.Select(x => $"{x.Name}: {RedactUrl(x.Url)}"));
            _quality = quality;
            _videoInputIndexes = inputs.Select((input, index) => (input, index)).Where(x => x.input.Video).Select(x => x.index).ToArray();
            _videoInputCount = _videoInputIndexes.Length;
            _programInput = _videoInputIndexes.Contains(request.ProgramInput) ? request.ProgramInput : _videoInputIndexes[0];
            _layout = NormalizeLayout(request.Layout);
            _startedAt = DateTimeOffset.UtcNow;
            _state = "starting";

            var startInfo = new ProcessStartInfo
            {
                FileName = ffmpeg,
                UseShellExecute = false,
                RedirectStandardError = true,
                RedirectStandardOutput = true,
                CreateNoWindow = true
            };
            foreach (var arg in args) startInfo.ArgumentList.Add(arg);

            _process = new Process { StartInfo = startInfo, EnableRaisingEvents = true };
            _process.ErrorDataReceived += (_, e) => { if (e.Data is not null) AddLog(e.Data); };
            _process.Exited += (_, _) => HandleExit();

            try
            {
                if (!_process.Start()) throw new InvalidOperationException("FFmpeg could not be started.");
                _process.BeginErrorReadLine();
                _process.BeginOutputReadLine();
                _state = "live";
                AddLog("Broadcast relay started.");
                return Snapshot();
            }
            catch (Exception ex)
            {
                _state = "failed";
                _lastError = ex.Message;
                _process.Dispose();
                _process = null;
                throw new InvalidOperationException($"Unable to start FFmpeg. Verify LiveBroadcast:FfmpegPath. {ex.Message}", ex);
            }
        }
    }

    public LiveBroadcastStatus Stop()
    {
        lock (_gate)
        {
            if (_process is { HasExited: false })
            {
                try { _process.Kill(entireProcessTree: true); }
                catch (Exception ex) { _logger.LogWarning(ex, "Failed to stop live broadcast process cleanly"); }
            }
            _state = "stopped";
            AddLog("Broadcast stopped by operator.");
            return Snapshot();
        }
    }

    public async Task<LiveBroadcastStatus> SwitchAsync(LiveBroadcastSwitchRequest request, CancellationToken cancellationToken = default)
    {
        int selected;
        string layout;
        lock (_gate)
        {
            if (_process is not { HasExited: false } || _state is not ("starting" or "live"))
                throw new InvalidOperationException("Start the broadcast before switching Program.");
            selected = Array.IndexOf(_videoInputIndexes, request.ProgramInput);
            if (selected < 0) throw new ArgumentException("The selected Program input is not an enabled video source.");
            layout = NormalizeLayout(request.Layout);
            if (_videoInputCount < 2)
            {
                _programInput = _videoInputIndexes[0];
                _layout = "single";
                return Snapshot();
            }
        }

        await SendControlCommandAsync("camera", $"map {selected}", cancellationToken);
        await SendControlCommandAsync("layout", $"map {LayoutIndex(layout)}", cancellationToken);

        lock (_gate)
        {
            _programInput = _videoInputIndexes[selected];
            _layout = layout;
            AddLog($"Program switched to camera {selected + 1} using {layout} layout.");
            return Snapshot();
        }
    }

    public async Task<BroadcastPreflight> PreflightAsync(CancellationToken cancellationToken = default)
    {
        var ffmpeg = _configuration["LiveBroadcast:FfmpegPath"] ?? "ffmpeg";
        try
        {
            var version = await RunProbe(ffmpeg, ["-version"], cancellationToken);
            var filters = await RunProbe(ffmpeg, ["-hide_banner", "-filters"], cancellationToken);
            var required = new[] { "afftdn", "loudnorm", "alimiter", "acompressor", "agate", "deesser", "equalizer", "dynaudnorm", "xstack", "drawtext", "streamselect", "zmq" };
            var capabilities = required.ToDictionary(x => x, x => filters.Contains(x, StringComparison.OrdinalIgnoreCase));
            var python = _configuration["LiveBroadcast:PythonPath"] ?? "python3";
            try
            {
                var pythonZmq = await RunProbe(python, ["-c", "import zmq; print('ready')"], cancellationToken);
                capabilities["python-zmq"] = pythonZmq.Contains("ready", StringComparison.OrdinalIgnoreCase);
            }
            catch { capabilities["python-zmq"] = false; }
            var ready = capabilities.Values.All(x => x);
            return new(ready, ffmpeg, version.Split('\n', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()?.Trim(), capabilities,
                ready ? null : "FFmpeg is installed but one or more required broadcast filters are missing.");
        }
        catch (Exception ex)
        {
            return new(false, ffmpeg, null, new Dictionary<string, bool>(), $"FFmpeg preflight failed: {ex.Message}");
        }
    }

    internal IReadOnlyList<string> BuildArguments(IReadOnlyList<BroadcastInput> inputs, IReadOnlyList<BroadcastDestination> destinations, IReadOnlyList<BroadcastOverlay> overlays, string layout, int programInput, string quality, bool record, string? recordingName, BroadcastAudioMix audioMix, BroadcastLocalOutput localOutput)
    {
        var (size, bitrate, maxrate, buffer) = quality switch
        {
            "720p" => ("1280:720", "2500k", "3000k", "6000k"),
            "480p" => ("854:480", "1200k", "1500k", "3000k"),
            _ => ("1920:1080", "4500k", "6000k", "12000k")
        };
        var args = new List<string> { "-hide_banner", "-nostdin" };
        foreach (var input in inputs)
        {
            args.AddRange(["-thread_queue_size", "1024"]);
            if (input.Loop || string.Equals(input.Kind, "media", StringComparison.OrdinalIgnoreCase))
                args.AddRange(["-stream_loop", "-1", "-re"]);
            if (input.Url.StartsWith("dshow://", StringComparison.OrdinalIgnoreCase))
                args.AddRange(["-f", "dshow", "-i", input.Url[8..]]);
            else if (input.Url.StartsWith("avfoundation://", StringComparison.OrdinalIgnoreCase))
                args.AddRange(["-f", "avfoundation", "-i", input.Url[15..]]);
            else if (input.Url.StartsWith("lavfi://", StringComparison.OrdinalIgnoreCase))
                // Generated sources have no natural clock and otherwise run as
                // fast as the CPU allows, flooding SRT/OBS at 10x+ real time.
                args.AddRange(["-re", "-f", "lavfi", "-i", input.Url[8..]]);
            else args.AddRange(["-i", input.Url]);
        }

        var selected = Math.Clamp(programInput, 0, inputs.Count - 1);
        var videoIndexes = inputs.Select((x, i) => (x, i)).Where(x => x.x.Video).Select(x => x.i).Take(4).ToArray();
        if (videoIndexes.Length == 0) throw new ArgumentException("At least one enabled video input is required.");
        var filters = new List<string>();
        foreach (var i in videoIndexes)
            filters.Add($"[{i}:v]scale={size}:force_original_aspect_ratio=decrease,pad={size}:(ow-iw)/2:(oh-ih)/2,setsar=1[v{i}]");

        BuildLiveSwitcher(filters, videoIndexes, size, selected, NormalizeLayout(layout), _controlPort);

        var current = "programbase"; var overlayNo = 0;
        foreach (var overlay in overlays.Take(8))
        {
            if (!string.Equals(overlay.Type, "text", StringComparison.OrdinalIgnoreCase) || string.IsNullOrWhiteSpace(overlay.Value)) continue;
            var next = $"ov{overlayNo++}"; var (x, y) = OverlayPosition(overlay.Position);
            var text = EscapeFilterText(overlay.Value); var color = SafeColor(overlay.Color); var opacity = Math.Clamp(overlay.Opacity, 0.1, 1).ToString("0.##", CultureInfo.InvariantCulture);
            filters.Add($"[{current}]drawtext=text='{text}':x={x}:y={y}:fontsize={Math.Clamp(overlay.FontSize, 16, 120)}:fontcolor={color}@{opacity}:box=1:boxcolor=black@0.45:boxborderw=14[{next}]"); current = next;
        }
        filters.Add($"[{current}]format=yuv420p[videoout]");

        var audio = inputs.Select((x, i) => (x, i)).Where(x => x.x.Audio && !x.x.Muted).ToArray();
        if (audio.Length > 0)
        {
            var mixLabels = new List<string>();
            foreach (var (input, i) in audio)
            {
                if (input.SplitStereo)
                {
                    filters.Add($"[{i}:a]asplit=2[split{i}l][split{i}r]");
                    if (!input.Channel1Muted) AddChannel($"[split{i}l]", $"a{i}l", "pan=stereo|c0=c0|c1=c0", input.Channel1GainDb, input.Channel1Volume, input.Channel1Pan);
                    if (!input.Channel2Muted) AddChannel($"[split{i}r]", $"a{i}r", "pan=stereo|c0=c1|c1=c1", input.Channel2GainDb, input.Channel2Volume, input.Channel2Pan);
                }
                else AddChannel($"[{i}:a]", $"a{i}", null, input.GainDb, input.Volume, input.Pan);

                void AddChannel(string source, string label, string? selector, double gainDb, double volume, double channelPan)
                {
                    var chain = new List<string>();
                    if (selector is not null) chain.Add(selector);
                    chain.AddRange(["aresample=48000:async=1:first_pts=0", "aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo"]);
                if (input.SyncMs > 0)
                {
                    var delay = Math.Clamp(input.SyncMs, 0, 2000);
                    chain.Add($"adelay={delay}|{delay}");
                }
                else if (input.SyncMs < 0)
                {
                    var advance = (Math.Clamp(-input.SyncMs, 0, 2000) / 1000d).ToString("0.###", CultureInfo.InvariantCulture);
                    chain.Add($"atrim=start={advance}");
                    chain.Add("asetpts=PTS-STARTPTS");
                }
                if (audioMix.HighPass) chain.Add("highpass=f=80");
                chain.Add("lowpass=f=18000");
                if (input.Denoise)
                {
                    var noiseFloor = -Math.Clamp(audioMix.NoiseReduction, 20, 60);
                    chain.Add($"afftdn=nf={noiseFloor}:tn=1:gs=5");
                }
                if (input.Gate) chain.Add("agate=threshold=0.015:ratio=2:attack=10:release=180:makeup=1");
                if (Math.Abs(input.EqLowDb) > .05) chain.Add($"equalizer=f=120:t=q:w=0.8:g={Db(input.EqLowDb, -12, 12)}");
                if (Math.Abs(input.EqMidDb) > .05) chain.Add($"equalizer=f=2500:t=q:w=1:g={Db(input.EqMidDb, -12, 12)}");
                if (Math.Abs(input.EqHighDb) > .05) chain.Add($"equalizer=f=8000:t=q:w=0.8:g={Db(input.EqHighDb, -12, 12)}");
                if (input.DeEsser) chain.Add("deesser=i=0.25:m=0.5:f=0.5:s=o");
                if (input.Compressor || input.SpeechLevel)
                    chain.Add("acompressor=threshold=0.125:ratio=3:attack=15:release=180:makeup=1.35:knee=2.5:detection=rms");
                // Dynamic normalization uses a sizeable analysis window. Keep it
                // out of the low-latency path; the compressor provides fast,
                // predictable speech leveling without accumulating A/V delay.
                if (audioMix.AutoGain && !audioMix.LowLatency && string.Equals(audioMix.Mode, "auto", StringComparison.OrdinalIgnoreCase))
                    chain.Add("dynaudnorm=f=250:g=15:p=0.9:m=8:r=0.1");
                    chain.Add($"volume={Db(gainDb, -24, 24)}dB");
                    chain.Add($"volume={Math.Clamp(volume, 0, 2).ToString("0.##", CultureInfo.InvariantCulture)}");
                    var pan = Math.Clamp(channelPan, -1, 1);
                if (Math.Abs(pan) > .01)
                {
                    var left = pan > 0 ? 1 - pan : 1;
                    var right = pan < 0 ? 1 + pan : 1;
                    chain.Add($"pan=stereo|c0={left.ToString("0.###", CultureInfo.InvariantCulture)}*c0|c1={right.ToString("0.###", CultureInfo.InvariantCulture)}*c1");
                }
                    filters.Add($"{source}{string.Join(',', chain)}[{label}]");
                    mixLabels.Add($"[{label}]");
                }
            }
            var postMix = new List<string>();
            if (audioMix.Normalize && !audioMix.LowLatency && string.Equals(audioMix.Mode, "auto", StringComparison.OrdinalIgnoreCase))
                postMix.Add($"loudnorm=I={Math.Clamp(audioMix.TargetLufs, -24, -10).ToString("0.##", CultureInfo.InvariantCulture)}:TP=-2:LRA=7:linear=true");
            if (Math.Abs(audioMix.MasterGainDb) > .05) postMix.Add($"volume={Db(audioMix.MasterGainDb, -12, 12)}dB");
            if (audioMix.Limiter) postMix.Add("alimiter=limit=0.89:attack=5:release=100:level=disabled");
            var post = postMix.Count == 0 ? "anull" : string.Join(',', postMix);
            if (mixLabels.Count == 0) filters.Add("anullsrc=channel_layout=stereo:sample_rate=48000[audioout]");
            else filters.Add($"{string.Concat(mixLabels)}amix=inputs={mixLabels.Count}:duration=longest:dropout_transition=2:normalize=0,{post}[audioout]");
        }
        else filters.Add("anullsrc=channel_layout=stereo:sample_rate=48000[audioout]");

        args.AddRange(["-filter_complex", string.Join(";", filters), "-map", "[videoout]", "-map", "[audioout]", "-c:v", "libx264", "-preset", "veryfast", "-tune", "zerolatency", "-b:v", bitrate, "-maxrate", maxrate, "-bufsize", buffer, "-r", "30", "-g", "60", "-keyint_min", "60", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2"]);
        var tee = destinations.Select(d => $"[f=flv:onfail=ignore]{d.IngestUrl.TrimEnd('/')}/{d.StreamKey.Trim()}").ToList();
        if (localOutput.Enabled)
        {
            var protocol = string.Equals(localOutput.Protocol, "srt", StringComparison.OrdinalIgnoreCase) ? "srt" : "udp";
            var host = SafeHost(localOutput.Host);
            var port = Math.Clamp(localOutput.Port, 1024, 65535);
            var latencyUs = Math.Clamp(localOutput.LatencyMs, 40, 2000) * 1000;
            var query = protocol == "udp" ? "?pkt_size=1316" : $"?mode=listener&latency={latencyUs}";
            tee.Add($"[f=mpegts:onfail=ignore]{protocol}://{host}:{port}{query}");
        }
        if (record)
        {
            var root = _configuration["LiveBroadcast:RecordingPath"] ?? Path.Combine(AppContext.BaseDirectory, "broadcast-recordings"); Directory.CreateDirectory(root);
            var safeName = string.Concat((recordingName ?? $"broadcast-{DateTime.UtcNow:yyyyMMdd-HHmmss}").Select(c => char.IsLetterOrDigit(c) || c is '-' or '_' ? c : '-'));
            tee.Add($"[f=matroska:onfail=ignore]{Path.Combine(root, safeName + ".mkv")}");
        }
        // Each tee slave runs on its own FIFO thread. In particular, an SRT
        // listener waiting for OBS must not stop FFmpeg from consuming the
        // incoming laptop feed; otherwise the SRT receive buffer fills and the
        // publisher is disconnected after a few seconds.
        args.AddRange([
            "-use_fifo", "1",
            "-fifo_options", "attempt_recovery=1:drop_pkts_on_overflow=1:recovery_wait_time=1",
            "-f", "tee", string.Join('|', tee)
        ]);
        return args;
    }

    private IReadOnlyList<BroadcastInput> NormalizeInputs(LiveBroadcastStartRequest r) => r.Inputs?.Where(x => !string.IsNullOrWhiteSpace(x.Url)).Take(8).ToArray() is { Length: > 0 } list ? list : string.IsNullOrWhiteSpace(r.InputUrl) ? [] : [new("camera-1", "Camera 1", r.InputUrl)];

    private static void BuildLiveSwitcher(List<string> filters, IReadOnlyList<int> videoIndexes, string size, int selectedInputIndex, string layout, int controlPort)
    {
        if (videoIndexes.Count == 1)
        {
            filters.Add($"[v{videoIndexes[0]}]null[programbase]");
            return;
        }

        var selected = Math.Max(0, Array.IndexOf(videoIndexes.ToArray(), selectedInputIndex));
        var branchCounts = Enumerable.Range(0, videoIndexes.Count).Select(i => i < 2 ? 4 : 2).ToArray();
        for (var n = 0; n < videoIndexes.Count; n++)
        {
            var labels = new List<string> { $"[single{n}]", $"[grid{n}]" };
            if (n < 2) labels.AddRange([$"[split{n}]", $"[pip{n}]"]);
            filters.Add($"[v{videoIndexes[n]}]split={branchCounts[n]}{string.Concat(labels)}");
        }

        filters.Add($"{string.Concat(Enumerable.Range(0, videoIndexes.Count).Select(n => $"[single{n}]"))}streamselect@camera=inputs={videoIndexes.Count}:map={selected}[singleprogram]");
        filters.Add("[split0]scale=iw/2:ih[splitL];[split1]scale=iw/2:ih[splitR];[splitL][splitR]hstack=inputs=2[splitprogram]");
        filters.Add("[pip1]scale=iw/4:ih/4[pipSmall];[pip0][pipSmall]overlay=W-w-40:40[pipprogram]");

        var cell = size.Split(':');
        var cw = int.Parse(cell[0], CultureInfo.InvariantCulture) / 2;
        var ch = int.Parse(cell[1], CultureInfo.InvariantCulture) / 2;
        for (var n = 0; n < videoIndexes.Count; n++) filters.Add($"[grid{n}]scale={cw}:{ch}[g{n}]");
        var positions = string.Join('|', new[] { "0_0", "w0_0", "0_h0", "w0_h0" }.Take(videoIndexes.Count));
        filters.Add($"{string.Concat(Enumerable.Range(0, videoIndexes.Count).Select(n => $"[g{n}]"))}xstack=inputs={videoIndexes.Count}:layout={positions}:fill=black[gridprogram]");
        filters.Add($"[singleprogram][splitprogram][pipprogram][gridprogram]streamselect@layout=inputs=4:map={LayoutIndex(layout)}[selectedprogram]");
        // The address is parsed once by the filtergraph and again by the zmq
        // filter option parser. Three literal backslashes must therefore reach
        // FFmpeg before each colon (there is no shell layer because ArgumentList
        // is used to launch the process).
        filters.Add($"[selectedprogram]zmq=b=tcp\\\\\\://127.0.0.1\\\\\\:{controlPort}[programbase]");
    }

    private async Task SendControlCommandAsync(string target, string command, CancellationToken cancellationToken)
    {
        var python = _configuration["LiveBroadcast:PythonPath"] ?? "python3";
        var script = Path.Combine(AppContext.BaseDirectory, "Scripts", "Broadcast", "zmq_send.py");
        if (!File.Exists(script)) throw new InvalidOperationException($"Broadcast control helper is missing: {script}");
        var result = await RunProbe(python, [script, $"tcp://127.0.0.1:{_controlPort}", target, command], cancellationToken);
        if (!result.Contains("Success", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"FFmpeg rejected the live switch command: {result.Trim()}");
    }

    private static string NormalizeLayout(string? layout) => layout?.ToLowerInvariant() is "split" or "pip" or "grid" ? layout.ToLowerInvariant() : "single";
    private static int LayoutIndex(string layout) => layout switch { "split" => 1, "pip" => 2, "grid" => 3, _ => 0 };
    private IReadOnlyList<BroadcastDestination> NormalizeDestinations(LiveBroadcastStartRequest r)
    {
        var list = r.Destinations?.Where(x => x.Enabled && !string.IsNullOrWhiteSpace(x.IngestUrl) && !string.IsNullOrWhiteSpace(x.StreamKey)).Take(4).ToArray();
        if (list is { Length: > 0 }) return list;
        if (string.IsNullOrWhiteSpace(r.StreamKey)) return [];
        return [new("YouTube", r.IngestUrl ?? _configuration["LiveBroadcast:YouTubeIngestUrl"] ?? "rtmps://a.rtmps.youtube.com:443/live2", r.StreamKey)];
    }
    private static (string x, string y) OverlayPosition(string? position) => position?.ToLowerInvariant() switch { "top-left" => ("40", "40"), "top-right" => ("w-text_w-40", "40"), "bottom-right" => ("w-text_w-40", "h-text_h-40"), "center" => ("(w-text_w)/2", "(h-text_h)/2"), _ => ("40", "h-text_h-60") };
    private static string SafeColor(string? color) => string.IsNullOrWhiteSpace(color) || !color.All(c => char.IsLetterOrDigit(c) || c == '#') ? "white" : color;
    private static string SafeHost(string? host) => string.IsNullOrWhiteSpace(host) || !host.All(c => char.IsLetterOrDigit(c) || c is '.' or '-' or ':') ? "127.0.0.1" : host;
    private static string Db(double value, double min, double max) => Math.Clamp(value, min, max).ToString("0.##", CultureInfo.InvariantCulture);
    private static string EscapeFilterText(string value) => value.Replace("\\", "\\\\").Replace(":", "\\:").Replace("'", "\\'").Replace("%", "\\%").Replace("[", "\\[").Replace("]", "\\]");

    private static string NormalizeQuality(string? value) => value?.ToLowerInvariant() switch { "480p" => "480p", "720p" => "720p", _ => "1080p" };
    private static string RedactUrl(string url) { try { var u = new Uri(url); return $"{u.Scheme}://{u.Host}{(u.IsDefaultPort ? "" : $":{u.Port}")}{u.AbsolutePath}"; } catch { return "configured input"; } }
    private void AddLog(string line)
    {
        lock (_gate)
        {
            foreach (var secret in _logSecrets) if (!string.IsNullOrEmpty(secret)) line = line.Replace(secret, "[STREAM-KEY]", StringComparison.Ordinal);
            var safe = line.Length > 500 ? line[..500] : line;
            _recentLog.Enqueue(safe);
            while (_recentLog.Count > 50) _recentLog.Dequeue();
            if (IsImportantLog(safe))
            {
                _importantLog.Enqueue(safe);
                while (_importantLog.Count > 12) _importantLog.Dequeue();
                if (string.IsNullOrWhiteSpace(_lastError) && !safe.Contains("Conversion failed", StringComparison.OrdinalIgnoreCase))
                    _lastError = safe;
            }
        }
    }
    private void HandleExit() { lock (_gate) { if (_state == "stopped") return; var exit = _process?.ExitCode ?? -1; _state = exit == 0 ? "stopped" : "failed"; if (exit != 0 && string.IsNullOrWhiteSpace(_lastError)) _lastError = $"FFmpeg exited with code {exit}. Check the input feed, audio track, and output connection."; } }
    private LiveBroadcastStatus Snapshot()
    {
        var logs = _importantLog.Concat(_recentLog).Distinct(StringComparer.Ordinal).TakeLast(62).ToArray();
        return new(_state, _startedAt, _process is { HasExited: false } ? _process.Id : null, _inputUrl, _quality, _lastError, logs);
    }
    private static bool IsImportantLog(string line) =>
        line.Contains("error", StringComparison.OrdinalIgnoreCase) ||
        line.Contains("failed", StringComparison.OrdinalIgnoreCase) ||
        line.Contains("broken pipe", StringComparison.OrdinalIgnoreCase) ||
        line.Contains("connection", StringComparison.OrdinalIgnoreCase) ||
        line.Contains("reset by peer", StringComparison.OrdinalIgnoreCase) ||
        line.Contains("refused", StringComparison.OrdinalIgnoreCase) ||
        line.Contains("timed out", StringComparison.OrdinalIgnoreCase) ||
        line.Contains("unable", StringComparison.OrdinalIgnoreCase);
    private static async Task<string> RunProbe(string executable, IReadOnlyList<string> arguments, CancellationToken cancellationToken)
    {
        var info = new ProcessStartInfo { FileName = executable, UseShellExecute = false, RedirectStandardOutput = true, RedirectStandardError = true, CreateNoWindow = true };
        foreach (var argument in arguments) info.ArgumentList.Add(argument);
        using var process = new Process { StartInfo = info };
        if (!process.Start()) throw new InvalidOperationException("FFmpeg could not be started.");
        var stdout = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var stderr = process.StandardError.ReadToEndAsync(cancellationToken);
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(10));
        try { await process.WaitForExitAsync(timeout.Token); }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested) { process.Kill(entireProcessTree: true); throw new TimeoutException("FFmpeg did not answer within 10 seconds."); }
        var output = (await stdout) + "\n" + (await stderr);
        if (process.ExitCode != 0) throw new InvalidOperationException($"{Path.GetFileName(executable)} exited with code {process.ExitCode}: {output.Trim()}");
        return output;
    }
    public void Dispose() { lock (_gate) { if (_process is { HasExited: false }) _process.Kill(entireProcessTree: true); _process?.Dispose(); } }
}
