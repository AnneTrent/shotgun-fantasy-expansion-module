import { randomBytes } from "crypto";
import { readdirSync, readFileSync, writeFileSync, renameSync } from "fs";
import { join, extname, basename, dirname } from "path";

// All source directories to scan — keep in sync with PACKS in build.js
const SCAN_DIRS = [
  "src/feats",
  "src/archetypes-classes",
  "src/backgrounds-professions",
  "src/plans-tricks",
  "src/equipment",
];

// Full base62 charset — matches Foundry's own ID generation exactly
const BASE62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function generateId() {
  const bytes = randomBytes(16);
  let id = "";
  for (let i = 0; i < 16; i++) {
    id += BASE62[bytes[i] % 62];
  }
  return id;
}

function processFolderFile(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  let data;

  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.warn(`⚠️  Skipping ${filePath} — invalid JSON`);
    return;
  }

  // Skip if already has a valid _id
  if (data._id && data._id !== null) {
    console.log(`✅ Folder already has ID: ${data.name} (${data._id})`);
    return;
  }

  const newId = generateId();
  data._id = newId;
  data._key = `!folders!${newId}`;

  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`📁 Generated ID for folder: ${data.name} → ${newId}`);
}

function processFile(filePath) {
  // Route _folder.json files to their own handler (case-insensitive)
  if (basename(filePath).toLowerCase() === "_folder.json") {
    processFolderFile(filePath);
    return;
  }

  const raw = readFileSync(filePath, "utf-8");
  let data;

  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.warn(`⚠️  Skipping ${filePath} — invalid JSON`);
    return;
  }

  // Skip if already has a valid _id
  if (data._id && data._id !== null) {
    console.log(`✅ Already has ID: ${data.name} (${data._id})`);
    return;
  }

  // Generate new ID and key
  const newId = generateId();
  data._id = newId;
  data._key = `!items!${newId}`;

  // Rename file to include ID suffix matching Foundry convention:
  // e.g. Fighter_Training.json → Fighter_Training-aBcDeFgHiJkLmNoP.json
  const dir = dirname(filePath);
  const oldName = basename(filePath, ".json");
  const newFileName = `${oldName}-${newId}.json`;
  const newFilePath = join(dir, newFileName);

  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  renameSync(filePath, newFilePath);

  console.log(`🆔 Generated ID for: ${data.name} → ${newId} (renamed to ${newFileName})`);
}

function scanDir(dir) {
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
      scanDir(fullPath);
    } else if (extname(file.name) === ".json") {
      processFile(fullPath);
    }
  }
}

console.log("🔍 Scanning for missing IDs...\n");
for (const dir of SCAN_DIRS) {
  scanDir(dir);
}
console.log("\n✨ Done!");