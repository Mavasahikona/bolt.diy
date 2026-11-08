import { readFileSync, writeFileSync } from 'node:fs';

/*
 * Provider credentials arrive as container environment variables (Dokploy env,
 * docker --env-file), but the SSR runtime is workerd: it has no access to the
 * OS environment and only sees bindings from the wrangler config. Without this
 * step `context.cloudflare.env.DEEPSEEK_API_KEY` is undefined and every provider
 * call answers "Invalid or missing API key".
 *
 * Mirror the credential keys into `vars` at container start (never at build, so
 * the secret stays out of the image layers) and let the preview server pick them
 * up as worker bindings.
 */
const CONFIG = 'wrangler.jsonc';

const CREDENTIAL_PREFIXES = [
  'DEEPSEEK_',
  'OPENAI_',
  'OPENAI_LIKE_',
  'ANTHROPIC_',
  'OPEN_ROUTER_',
  'GROQ_',
  'GOOGLE_GENERATIVE_AI_',
  'MISTRAL_',
  'COHERE_',
  'XAI_',
  'TOGETHER_',
  'PERPLEXITY_',
  'CEREBRAS_',
  'FIREWORKS_',
  'MOONSHOT_',
  'ZAI_',
  'HYPERBOLIC_',
  'HuggingFace_',
  'OLLAMA_',
  'LMSTUDIO_',
  'AWS_BEDROCK_',
  'GITHUB_API_',
  'GITHUB_TOKEN_',
];

const isCredential = (key) => CREDENTIAL_PREFIXES.some((prefix) => key.startsWith(prefix));

try {
  const config = JSON.parse(readFileSync(CONFIG, 'utf8'));

  config.vars = { ...(config.vars ?? {}) };

  let injected = 0;

  for (const [key, value] of Object.entries(process.env)) {
    if (!value || !isCredential(key)) {
      continue;
    }

    config.vars[key] = value;
    injected += 1;
  }

  writeFileSync(CONFIG, `${JSON.stringify(config, null, 2)}\n`);

  console.log(`[inject-worker-vars] exposed ${injected} credential binding(s) to the worker runtime`);
} catch (error) {
  console.error('[inject-worker-vars] skipped:', error?.message ?? error);
}
