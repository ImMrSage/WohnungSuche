import fs from "node:fs";
import path from "node:path";

export async function fetchFileListings(dataDir) {
  const filePath = path.join(dataDir, "manual-listings.json");

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(content);

  return Array.isArray(parsed) ? parsed : [];
}
