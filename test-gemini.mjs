import { GoogleGenerativeAI } from "@google/generative-ai";

const key = process.env.GOOGLE_API_KEY;
if (!key) {
  console.error("GOOGLE_API_KEY not set. Add it in Replit → Tools → Secrets and/or export in shell.");
  process.exit(1);
}

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro-preview-03-25";

async function main() {
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: MODEL });
    const resp = await model.generateContent("Reply with OK only.");
    console.log(resp.response.text());
  } catch (err) {
    console.error("Gemini call failed:", err?.message || err);
    // Log underlying error fields if present
    if (err?.response?.status) console.error("HTTP status:", err.response.status);
    if (err?.response?.data) console.error("HTTP data:", err.response.data);
  }
}

main();
