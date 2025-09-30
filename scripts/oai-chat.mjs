import OpenAI from "openai";
import fs from "fs";
import readline from "readline";

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY. Add it in Replit Secrets or export it in shell.");
  process.exit(1);
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Config (defaults to GPT-5 nano for lowest cost) ---
let MODEL = process.env.OAI_MODEL || "gpt-5-nano";
let SYSTEM = "You are a precise coding assistant. Prefer minimal, correct, runnable code. When changing files, propose diffs if asked.";
const MAX_TURNS = 24; // keep context lean/cheap

let convo = [{ role: "system", content: SYSTEM }];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "\x1b[38;5;213m»\x1b[0m " });
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

function help() {
  console.log(dim(`
Commands:
  /model <name>      set model (e.g. gpt-5-nano, gpt-5-mini)
  /sys <text>        set system prompt
  /file <path>       send a file's contents as the next user message
  /patch <file> <msg> ask for a unified diff to modify <file>
  /clear             clear conversation history (keeps system)
  /help              show this help
  /exit              quit
`));
}

async function reply(inputBlocks) {
  // Simple (non-streaming) call for reliability in all Node envs
  const res = await client.responses.create({
    model: MODEL,
    input: inputBlocks,
  });
  const text = res.output_text;
  process.stdout.write(text + "\n");
  return text;
}

async function askLLM(userText) {
  const base = [{ role: "system", content: SYSTEM }, ...convo.slice(-2 * MAX_TURNS)];
  const input = [...base, { role: "user", content: userText }];
  const text = await reply(input);
  convo.push({ role: "user", content: userText });
  convo.push({ role: "assistant", content: text });
}

async function askPatch(file, msg) {
  const code = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const input = [
    { role: "system", content: "Return ONLY a valid unified diff (patch) for the specified file. No prose." },
    { role: "user", content: `File: ${file}\n\n--- CURRENT CONTENT ---\n${code}\n\n--- REQUEST ---\n${msg}` },
  ];
  await reply(input);
  console.log(dim("\nTip: apply with  echo '<patch>' | patch -p0"));
}

console.log(bold(`OpenAI shell chat · model=${MODEL}`));
help();
rl.prompt();

rl.on("line", async (line) => {
  const s = line.trim();

  try {
    if (!s) { rl.prompt(); return; }

    if (s === "/help") { help(); rl.prompt(); return; }
    if (s === "/exit") { process.exit(0); }
    if (s === "/clear") {
      convo = [{ role: "system", content: SYSTEM }];
      console.log(dim("History cleared."));
      rl.prompt(); return;
    }
    if (s.startsWith("/model ")) {
      MODEL = s.split(/\s+/, 2)[1] || MODEL;
      console.log(dim(`Model set to ${MODEL}`));
      rl.prompt(); return;
    }
    if (s.startsWith("/sys ")) {
      SYSTEM = s.slice(5).trim() || SYSTEM;
      convo = [{ role: "system", content: SYSTEM }];
      console.log(dim("System prompt updated and history reset."));
      rl.prompt(); return;
    }
    if (s.startsWith("/file ")) {
      const path = s.slice(6).trim();
      if (!fs.existsSync(path)) {
        console.log(dim(`No such file: ${path}`));
        rl.prompt(); return;
      }
      const body = fs.readFileSync(path, "utf8");
      await askLLM(`You are assisting with this repo. Here is the file ${path}:\n\n${body}\n\n---\nExplain issues and propose fixes. If changes are needed, provide a unified diff.`);
      rl.prompt(); return;
    }
    if (s.startsWith("/patch ")) {
      const [_, file, ...rest] = s.split(/\s+/);
      const msg = rest.join(" ") || "Make the requested improvement.";
      await askPatch(file, msg);
      rl.prompt(); return;
    }

    await askLLM(s);
  } catch (err) {
    console.error("\n[Error]", err?.message || err);
  } finally {
    rl.prompt();
  }
}).on("close", () => process.exit(0));
