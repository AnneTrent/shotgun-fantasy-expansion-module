/**
 * reset-folders.js
 *
 * ONE-TIME UTILITY SCRIPT
 * Resets the "folder" field back to null on all feat JSON files
 * so that assign-folders.js can be re-run cleanly.
 *
 * Usage:
 *   node scripts/reset-folders.js
 *
 * Safe to run multiple times. Does not touch _folder.json files or _id fields.
 */

import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join, extname, basename } from "path";

const FEATS_DIR = "src/feats";

function resetDir(dir) {
  let files;
  try {
    files = readdirSync(dir, { withFileTypes: true });
  } catch {
    console.warn(`⚠️  Could not read directory: ${dir}`);
    return;
  }

  for (const file of files) {
    const fullPath = join(dir, file.name);

    if (file.isDirectory()) {
      // Skip reference folders
      if (file.name === "eh-reference") {
        console.log(`⏭️  Skipping reference folder: ${fullPath}`);
        continue;
      }
      resetDir(fullPath);
      continue;
    }

    if (extname(file.name) !== ".json") continue;
    if (basename(file.name).toLowerCase() === "_folder.json") continue;

    let data;
    try {
      data = JSON.parse(readFileSync(fullPath, "utf-8"));
    } catch {
      console.warn(`⚠️  Skipping ${fullPath} — invalid JSON`);
      continue;
    }

    if (data.folder === null) {
      console.log(`⏭️  Already null: ${data.name}`);
      continue;
    }

    data.folder = null;
    writeFileSync(fullPath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`🔄 Reset: ${data.name}`);
  }
}

console.log("🔄 Resetting folder assignments...\n");
resetDir(FEATS_DIR);
console.log("\n✨ Done! Now run: node scripts/assign-folders.js");