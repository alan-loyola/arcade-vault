import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
let input;
try {
  input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
} catch {
  process.exit(0);
}
const filePath = input?.tool_input?.file_path;
if (!filePath) process.exit(0);
const projectDir = path.resolve(
  process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
);
const target = path.resolve(filePath);
const relative = path.relative(projectDir, target);
// Solo archivos dentro del proyecto y que existan.
if (relative.startsWith("..") || path.isAbsolute(relative)) process.exit(0);
if (!existsSync(target)) process.exit(0);
// Ignorar carpetas generadas / de terceros.
const segments = relative.split(path.sep);
if (segments.some((s) => ["node_modules", ".next", ".git"].includes(s))) {
  process.exit(0);
}
const run = (args) =>
  spawnSync("npx", args, {
    cwd: projectDir,
    encoding: "utf8",
    shell: true,
  });
const isCode = /\.(m|c)?[jt]sx?$/.test(target);
// 0. Quitar líneas en blanco (código conciso). Respeta template literals.
if (isCode) {
  const original = readFileSync(target, "utf8");
  let inTemplate = false;
  const kept = [];
  for (const line of original.split(/\r?\n/)) {
    if (inTemplate || line.trim() !== "") kept.push(line);
    const ticks = line.replace(/\\./g, "").match(/`/g)?.length ?? 0;
    if (ticks % 2 === 1) inTemplate = !inTemplate;
  }
  const stripped = kept.join("\n");
  if (stripped !== original) writeFileSync(target, stripped);
}

// 1. Prettier (todos los tipos que soporte; ignora el resto).
const prettier = run([
  "prettier",
  "--write",
  "--ignore-unknown",
  `"${target}"`,
]);
if (prettier.status !== 0) {
  process.stderr.write(
    `Prettier falló en ${relative}:\n${prettier.stderr || prettier.stdout}\n`,
  );
  process.exit(2);
}

// 2. ESLint --fix solo para archivos JS/TS.
if (isCode) {
  const eslint = run(["eslint", "--fix", `"${target}"`]);
  if (eslint.status !== 0) {
    process.stderr.write(
      `ESLint encontró errores en ${relative}:\n${eslint.stdout}${eslint.stderr}\n`,
    );
    process.exit(2);
  }
}

process.exit(0);
