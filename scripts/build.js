import { execSync } from "child_process";
import { createInterface } from "readline";
import { existsSync } from "fs";

function run(command) {
  console.log(`\n▶ ${command}`);
  execSync(command, { stdio: "inherit" });
}

function prompt(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// All compendium packs — add new ones here as your module grows.
// Each entry must also have a matching declaration in module.json.
const PACKS = [
  { name: "feats",                   in: "src/feats",                   out: "packs" },
  { name: "archetypes-classes",      in: "src/archetypes-classes",      out: "packs" },
  { name: "backgrounds-professions", in: "src/backgrounds-professions", out: "packs" },
  { name: "plans-tricks",            in: "src/plans-tricks",            out: "packs" },
  { name: "equipment",               in: "src/equipment",               out: "packs" },
];

async function build() {
  console.log("🔨 Shotgun Fantasy Build Script\n");

  // Step 1 — Generate missing IDs
  console.log("📋 Step 1: Generating missing IDs...");
  run("node scripts/generate-ids.js");

  // Step 2 — Pack all compendiums (skips packs whose src directory doesn't exist yet)
  // Note: --recursive tells the CLI to walk subdirectories for folder-organised packs
  console.log("\n📦 Step 2: Packing compendiums...");
  for (const pack of PACKS) {
    if (!existsSync(pack.in)) {
      console.log(`\n  ⏭️  Skipping ${pack.name} — src directory not found (${pack.in})`);
      continue;
    }
    console.log(`\n  📂 Packing: ${pack.name}`);
    run(`fvtt package pack ${pack.name} --in "${pack.in}" --out "${pack.out}" -n ${pack.name} --recursive`);
  }

  // Step 3 — Git commit and push
  console.log("\n📝 Step 3: Committing to GitHub...");
  const message = await prompt('Enter commit message (or press Enter to skip git): ');

  if (!message) {
    console.log("\n⏭️  Skipping git commit.");
  } else {
    run("git add -A");
    run(`git commit -m "${message}"`);
    run("git push");
    console.log("\n🚀 Pushed to GitHub!");
  }

  console.log("\n✨ Build complete!");
}

build().catch((err) => {
  console.error("\n❌ Build failed:", err.message);
  process.exit(1);
});