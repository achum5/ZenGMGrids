import { GoogleGenerativeAI } from "@google/generative-ai";
import pRetry, { AbortError } from "p-retry";

const key = process.env.GOOGLE_API_KEY;
if (!key) {
  console.error("GOOGLE_API_KEY missing. Add it in Replit → Tools → Secrets.");
  process.exit(1);
}
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash"; // fast + quota-friendly default

const genAI = new GoogleGenerativeAI(key);
const model = genAI.getGenerativeModel({ model: MODEL });

async function ask(text) {
  const run = async () => {
    const resp = await model.generateContent(text);
    return resp.response.text();
  };
  return pRetry(run, {
    retries: 5, factor: 2, minTimeout: 600, maxTimeout: 8000,
    onFailedAttempt: e => {
      const status = e?.response?.status || e?.status;
      if ([400,401,403,404].includes(status)) throw new AbortError(e.message || "Permanent error");
    }
  });
}

const arg = process.argv.slice(2).join(" ").trim();
const readStdin = async () => new Promise(res => {
  let s=""; process.stdin.setEncoding("utf8");
  process.stdin.on("data", c=>s+=c); process.stdin.on("end", ()=>res(s.trim()));
});

const main = async () => {
  const prompt = arg || await readStdin();
  if (!prompt) { console.error("Usage: node scripts/gemini-run.mjs \"your prompt\"  (or pipe text via stdin)"); process.exit(2); }
  try {
    const out = await ask(prompt);
    console.log(out);
  } catch (err) {
    console.error("Gemini error:", err?.message || err);
    if (err?.response?.status) console.error("HTTP status:", err.response.status);
    if (err?.response?.data) console.error("HTTP data:", JSON.stringify(err.response.data));
    process.exit(1);
  }
};
main();
