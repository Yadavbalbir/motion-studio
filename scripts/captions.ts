import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT, prepare, readReel } from "./lib";
import { slugSchema } from "../src/model";

export async function alignCaptions(slug: string) {
  slugSchema.parse(slug);
  await readReel(slug);
  const python = path.join(ROOT, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  const child = spawn(python, [path.join(ROOT, "voice/align.py"), slug], { cwd: ROOT, stdio: "inherit" });
  await new Promise<void>((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`Caption alignment exited with ${code}. No estimated timestamps were substituted.`)));
  });
  await prepare(slug, false);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [slug, ...flags] = process.argv.slice(2);
  const command = flags.length ? Promise.reject(new Error("Usage: npm run captions -- <slug>")) : alignCaptions(slug);
  command.catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
}
