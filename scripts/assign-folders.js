/**
 * assign-folders.js
 *
 * ONE-TIME MIGRATION SCRIPT
 * Run this once after your first build has populated _folder.json IDs.
 *
 * Usage:
 *   node scripts/assign-folders.js
 *
 * What it does:
 *   - Reads the _id from each _folder.json in src/feats
 *   - Matches feats to their folder based on system.type.category
 *   - Writes the correct folder _id into each feat's "folder" field
 *   - Skips feats that already have a folder assigned 
 */

import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join, extname, basename } from "path";

const FEATS_DIR = "src/feats";

// Maps system.type.category → subfolder directory name
// Update this if you add more feat categories in the future
const CATEGORY_TO_FOLDER = {
  "basic":      "basic-feats",
  "advanced":   "advanced-feats",
  "multiclass": "multiclass-feats",
};

// Step 1 — Read folder IDs from each _folder.json
function loadFolderIds() {
  const folderIds = {};

  for (const [category, dirName] of Object.entries(CATEGORY_TO_FOLDER)) {
    const folderPath = join(FEATS_DIR, dirName, "_folder.json");
    let data;

    try {
      data = JSON.parse(readFileSync(folderPath, "utf-8"));
    } catch {
      console.error(`❌ Could not read ${folderPath} — have you run the build yet?`);
      process.exit(1);
    }

    if (!data._id) {
      console.error(`❌ ${folderPath} has no _id yet — run 'node build.js' first, then re-run this script.`);
      process.exit(1);
    }

    folderIds[category] = data._id;
    console.log(`📁 ${category} → ${data.name} (${data._id})`);
  }

  return folderIds;
}

// Step 2 — Assign folder IDs to feat files
function assignFolders(folderIds) {
  let assigned = 0;
  let skipped = 0;
  let unmatched = 0;

  for (const [category, dirName] of Object.entries(CATEGORY_TO_FOLDER)) {
    const dirPath = join(FEATS_DIR, dirName);
    let files;

    try {
      files = readdirSync(dirPath, { withFileTypes: true });
    } catch {
      console.warn(`⚠️  Could not read ${dirPath} — skipping`);
      continue;
    }

    for (const file of files) {
      if (!file.isFile()) continue;
      if (extname(file.name) !== ".json") continue;
      if (basename(file.name).toLowerCase() === "_folder.json") continue;

      const filePath = join(dirPath, file.name);
      let data;

      try {
        data = JSON.parse(readFileSync(filePath, "utf-8"));
      } catch {
        console.warn(`⚠️  Skipping ${filePath} — invalid JSON`);
        continue;
      }

      // Skip if already assigned
      if (data.folder !== null && data.folder !== undefined) {
        console.log(`⏭️  Already assigned: ${data.name} → ${data.folder}`);
        skipped++;
        continue;
      }

      data.folder = folderIds[category];
      writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
      console.log(`✅ Assigned: ${data.name} → ${data.folder}`);
      assigned++;
    }
  }

  // Also scan root of src/feats for any unorganized feats
  const rootFiles = readdirSync(FEATS_DIR, { withFileTypes: true });
  for (const file of rootFiles) {
    if (!file.isFile()) continue;
    if (extname(file.name) !== ".json") continue;
    if (basename(file.name).toLowerCase() === "_folder.json") continue;

    const filePath = join(FEATS_DIR, file.name);
    let data;

    try {
      data = JSON.parse(readFileSync(filePath, "utf-8"));
    } catch {
      continue;
    }

    const category = data?.system?.type?.category;
    if (category && folderIds[category]) {
      // Feat is still at root but has a known category — warn the user
      console.warn(`⚠️  Unorganized feat still in src/feats root: ${data.name} (category: ${category})`);
      console.warn(`   Move it to src/feats/${CATEGORY_TO_FOLDER[category]}/ and re-run.`);
      unmatched++;
    }
  }

  console.log(`\n📊 Summary: ${assigned} assigned, ${skipped} already set, ${unmatched} unorganized`);
}

console.log("🗂️  Assigning folder IDs to feats...\n");
const folderIds = loadFolderIds();
console.log("");
assignFolders(folderIds);
console.log("\n✨ Done! You only need to run this script once.");