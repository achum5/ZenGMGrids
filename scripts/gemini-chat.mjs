import { GoogleGenerativeAI } from "@google/generative-ai";
import pRetry, { AbortError } from "p-retry";
import fs from "fs";
import readline from "readline";

const KEY = process.env.GOOGLE_API_KEY;
if (!KEY) {
  console.error("Missing GOOGLE_API_KEY. Add it in Replit → Tools → Secrets, then reopen the shell.");
  process.exit(1);
}
let MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const HIST_FILE = process.env.GEMINI_HISTORY_FILE || ".gemini_chat_history.json";

const genAI = new GoogleGenerativeAI(KEY);

function loadHistory() {
  try { return JSON.parse(fs.readFileSync(HIST_FILE, "utf8")); } catch { return []; }
}
function saveHistory(history) {
  try { fs.writeFileSync(HIST_FILE, JSON.stringify(history, null, 2)); } catch {}
}

let history = loadHistory(); // [{role:'user'|'model', text:'...'}]

function toGeminiHistory(h) {
  return h.map(({ role, text }) => ({
    role: role === "model" ? "model" : "user",
    parts: [{ text }]
  }));
}

function buildChat() {
  const model = genAI.getGenerativeModel({ model: MODEL });
  return model.startChat({ history: toGeminiHistory(history) });
}

let chat = buildChat();

async function send(text) {
  const run = async () => {
    const res = await chat.sendMessage(text);
    return res.response.text();
  };
  return pRetry(run, {
    retries: 5, factor: 2, minTimeout: 600, maxTimeout: 8000,
    onFailedAttempt: e => {
      const s = e?.response?.status || e?.status;
      if ([400,401,403,404].includes(s)) throw new AbortError(e.message || "Permanent error");
    }
  });
}

function printHelp() {
  console.log([
    "",
    "Commands:",
    "  /help          Show help",
    "  /reset         Clear history (new conversation)",
    "  /model NAME    Switch model (e.g., /model gemini-2.5-flash or /model gemini-2.5-pro-preview-03-25)",
    "  /flash         Quick switch to gemini-2.5-flash",
    "  /pro           Quick switch to gemini-2.5-pro-preview-03-25",
    "  /save FILE     Save transcript to FILE (default: .gemini_chat_history.json is auto-saved)",
    "  /show          Print current model + history length",
    "  Ctrl+C or Ctrl+D to exit",
    ""
  ].join("\n"));
}

async function handleCommand(cmd) {
  const [base, ...rest] = cmd.trim().split(/\s+/);
  if (base === "/help") { printHelp(); return; }
  if (base === "/reset") {
    history = [];
    saveHistory(history);
    chat = buildChat();
    console.log("(history cleared)");
    return;
  }
  if (base === "/model") {
    const name = rest.join(" ");
    if (!name) { console.log("Usage: /model <model-name>"); return; }
    MODEL = name;
    chat = buildChat();
    console.log(`(switched model to: ${MODEL})`);
    return;
  }
  if (base === "/flash") { MODEL = "gemini-2.5-flash"; chat = buildChat(); console.log("(model: gemini-2.5-flash)"); return; }
  if (base === "/pro")   { MODEL = "gemini-2.5-pro-preview-03-25"; chat = buildChat(); console.log("(model: gemini-2.5-pro-preview-03-25)"); return; }
  if (base === "/save") {
    const file = rest[0] || ".gemini_chat_export.txt";
    try {
      const text = history.map(m => `${m.role.toUpperCase()}: ${m.text}\n`).join("\n");
      fs.writeFileSync(file, text, "utf8");
      console.log(`(saved to ${file})`);
    } catch (e) { console.error("Save failed:", e.message); }
    return;
  }
  if (base === "/show") {
    console.log(`Model: ${MODEL} | Messages in history: ${history.length}`);
    return;
  }
  console.log("Unknown command. Type /help");
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "you > " });
console.log(`Gemini Chat. Model: ${MODEL}  (type /help for commands)`);
rl.prompt();

rl.on("line", async (line) => {
  const input = line.trim();
  if (!input) { rl.prompt(); return; }
  if (input.startsWith("/")) { await handleCommand(input); rl.prompt(); return; }

  history.push({ role: "user", text: input }); saveHistory(history);
  try {
    const reply = await send(input);
    history.push({ role: "model", text: reply }); saveHistory(history);
    console.log(`bot > ${reply}\n`);
  } catch (err) {
    console.error("bot !", err?.message || err);
  }
  rl.prompt();
}).on("close", () => {
  console.log("\nBye!");
  process.exit(0);
});
