<<<<<<< HEAD
# AI Pastor — LLM Provider Layer

This folder replaces the AI Pastor's direct OpenAI dependency with a
=======
﻿# AI Counseller — LLM Provider Layer

This folder replaces the AI Counseller's direct OpenAI dependency with a
>>>>>>> 6b902a41 (Update Mahima app server files and related changes)
**provider-agnostic LLM layer**. The pastor logic no longer knows or cares
which model answers — it talks to an `ILlmProvider`, selected by configuration.

## What changed

Before: `PastorBotService` called `https://api.openai.com/v1/responses` directly,
using `PastorBot:OpenAiApiKey`.

After:
- `ILlmProvider` — the abstraction.
- `OpenAiCompatibleLlmProvider` — one provider that speaks the OpenAI-compatible
  Chat Completions protocol, which **every mainstream LLM runtime supports**.
- `IScriptureService` / `ScriptureService` — retrieves real Bible verses from
  `scripture_pack.json` and injects them into the prompt so the pastor cites
  genuine references instead of hallucinating chapter/verse numbers.
- `PastorBotService` — refactored to use both. All personas, languages, and
  offline fallbacks are unchanged.

<<<<<<< HEAD
The result: you can drop OpenAI entirely and run the AI Pastor on a model you
=======
The result: you can drop OpenAI entirely and run the AI Counseller on a model you
>>>>>>> 6b902a41 (Update Mahima app server files and related changes)
host yourself, or on a cheaper hosted endpoint — by editing config only.

## Configuration

The `PastorBot` block in `appsettings.json` (override per environment / via
environment variables):

```json
"PastorBot": {
  "Provider": "openai-compatible",
  "BaseUrl":  "http://localhost:11434/v1",
  "ApiKey":   "",
  "Model":    "llama3.1",
  "VisionModel": "llama3.2-vision"
}
```

| Key | Meaning |
|-----|---------|
| `Provider`    | Provider id. Currently `openai-compatible`. |
| `BaseUrl`     | The OpenAI-compatible API root (the part before `/chat/completions`). |
| `ApiKey`      | Bearer token. **Leave empty for local Ollama / LM Studio.** |
| `Model`       | Text model name as the endpoint knows it. |
| `VisionModel` | Vision-capable model for the ReadMe camera feature (optional). |

Environment-variable form (no appsettings edit needed):
`PastorBot__BaseUrl`, `PastorBot__ApiKey`, `PastorBot__Model`, etc.

## Recipes — pick one

### A. Fully self-hosted, no external dependency (recommended for privacy / zero cost)

[Ollama](https://ollama.com) — install, then:

```bash
ollama pull llama3.1            # text model
ollama pull llama3.2-vision     # optional, for the ReadMe camera feature
ollama serve                    # exposes http://localhost:11434
```

```json
"PastorBot": {
  "Provider": "openai-compatible",
  "BaseUrl":  "http://localhost:11434/v1",
  "ApiKey":   "",
  "Model":    "llama3.1",
  "VisionModel": "llama3.2-vision"
}
```

Nothing leaves your server. No API bill. Needs a machine with ~8 GB+ RAM
(GPU strongly recommended for acceptable latency). Other good models:
`mistral`, `gemma2`, `qwen2.5`, `phi3`.

### B. Hosted, free tier, very fast — Groq

```json
"PastorBot": {
  "Provider": "openai-compatible",
  "BaseUrl":  "https://api.groq.com/openai/v1",
  "ApiKey":   "gsk_your_groq_key",
  "Model":    "llama-3.3-70b-versatile"
}
```

### C. Azure OpenAI (enterprise, your tenant)

```json
"PastorBot": {
  "Provider": "openai-compatible",
  "BaseUrl":  "https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT",
  "ApiKey":   "your-azure-key",
  "Model":    "gpt-4o-mini"
}
```

### D. Stay on OpenAI (no migration, just the new abstraction)

```json
"PastorBot": {
  "Provider": "openai-compatible",
  "BaseUrl":  "https://api.openai.com/v1",
  "ApiKey":   "sk-your-openai-key",
  "Model":    "gpt-4o-mini",
  "VisionModel": "gpt-4o"
}
```

Also works with **Together.ai**, **OpenRouter**, **vLLM**, **LM Studio**,
**llama.cpp server** — all expose the same `/chat/completions` contract.

## Behaviour when the LLM is unreachable

If `BaseUrl` is unset, the endpoint is down, or the call errors, `PastorBotService`
falls back to its built-in pastoral answers (`Source = "fallback"` on the reply).
<<<<<<< HEAD
The AI Pastor never returns a hard error to the user — it degrades gracefully.
=======
The AI Counseller never returns a hard error to the user — it degrades gracefully.
>>>>>>> 6b902a41 (Update Mahima app server files and related changes)

## Scripture grounding

`scripture_pack.json` holds a curated, multi-language verse set keyed by theme
and keywords. On every question:

1. `ScriptureService.FindRelevant()` scores verses against the user's words.
2. The top 3 verses are appended to the system prompt as a grounding block.
3. The model is instructed to quote **only** those verses, with exact references.

To extend coverage, add objects to the `verses` array in `scripture_pack.json` —
no code change, no redeploy of logic. The file is copied to the build output
automatically (see the `.csproj` `None Update` entry).

## The autonomous-pastor behaviour

The "acts like a pastor" character comes entirely from the engineered system
prompt in `PastorBotService.BuildSystemPrompt()` plus the Scripture grounding —
not from the model choice. Any competent instruction-tuned model (Llama 3.1+,
Mistral, GPT-4o-mini, Gemma 2) produces a consistent pastoral voice with this
setup. Safety guardrails (no impersonation of real public figures; crisis,
medical, abuse and self-harm situations routed to a real pastor) are part of
that prompt and apply regardless of provider.

## Adding a second provider type later

If you ever need a provider that is *not* OpenAI-compatible (e.g. the native
Anthropic Messages API), implement `ILlmProvider` in a new class and switch the
DI registration in `Program.cs`. Nothing in `PastorBotService` changes.
