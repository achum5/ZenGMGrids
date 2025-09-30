import { GoogleGenerativeAI } from '@google/generative-ai';
import PQueue from 'p-queue';
import pRetry, { AbortError } from 'p-retry';
import fs from 'fs';

const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Missing GOOGLE_API_KEY (or GEMINI_API_KEY) in Replit Secrets.');
  process.exit(1);
}

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-pro-exp-02-05';
const MAX_CHARS = Number(process.env.GEMINI_MAX_CHARS || 120000);
const MAX_OUTPUT_TOKENS = Number(process.env.GEMINI_MAX_TOKENS || 2048);
const CONCURRENCY = Number(process.env.GEMINI_CONCURRENCY || 1);
const RETRIES = Number(process.env.GEMINI_RETRIES || 5);

const genAI = new GoogleGenerativeAI(API_KEY);
const queue = new PQueue({ concurrency: CONCURRENCY, intervalCap: 1, interval: 250 });

function chunk(text, size) {
  const out = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

async function callGemini(prompt) {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS },
  });

  return pRetry(
    async () => {
      const res = await model.generateContent(prompt);
      return res.response.text();
    },
    {
      retries: RETRIES,
      factor: 2,
      minTimeout: 500,
      maxTimeout: 5000,
      onFailedAttempt: (err) => {
        const code = err?.response?.status || err?.code;
        if (![429, 500, 502, 503, 504].includes(Number(code))) {
          throw new AbortError(err);
        }
      },
    }
  );
}

async function main() {
  const arg = process.argv[2];
  const basePrompt =
    (arg && fs.existsSync(arg) ? fs.readFileSync(arg, 'utf8') : process.argv.slice(2).join(' ')) || 'Hello';

  const preamblePath = 'prompts/_preamble.txt';
  const preamble = fs.existsSync(preamblePath) ? fs.readFileSync(preamblePath, 'utf8') + '\n\n' : '';
  const full = preamble + basePrompt;

  let output = '';
  for (const part of chunk(full, MAX_CHARS)) {
    output += await queue.add(() => callGemini(part)) + '\n';
  }
  process.stdout.write(output.trim());
}

main().catch(err => {
  console.error('Gemini call failed:', err?.message || err);
  process.exit(1);
});

