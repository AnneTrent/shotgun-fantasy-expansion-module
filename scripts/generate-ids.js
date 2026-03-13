import { randomBytes } from "crypto";
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join, extname } from "path";

// Folders to scan for feat JSON files
const SCAN_DIRS = ["src/feats"];

function generateId() {
  return randomBytes(8).toString("hex").slice(0, 16);
}

function processFile(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  let data;

  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.warn(`⚠️  Skipping ${filePath} — invalid JSON`);
    return;
  }

  // Skip folder entries and non-items
  if (data._key && data._key.startsWith("!folders!")) {
    console.log(`⏭️  Skipping folder entry: ${filePath}`);
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

  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`🆔 Generated ID for: ${data.name} → ${newId}`);
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
      // Skip the eh-reference folder
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

console.log("🔍 Scanning for feats missing IDs...\n");
for (const dir of SCAN_DIRS) {
  scanDir(dir);
}
console.log("\n✨ Done!");