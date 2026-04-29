import fs from "node:fs";
import path from "node:path";

function ensureJsonFile(filePath, fallback) {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
  }
}

function readJson(filePath, fallback) {
  ensureJsonFile(filePath, fallback);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  ensureJsonFile(filePath, value);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

export class JsonStore {
  constructor(dataDir) {
    this.chatFile = path.join(dataDir, "chat-ids.json");
    this.listingsFile = path.join(dataDir, "seen-listings.json");
  }

  getChatIds() {
    return readJson(this.chatFile, []);
  }

  saveChatId(chatId) {
    const chatIds = this.getChatIds();
    const normalized = String(chatId);

    if (!chatIds.includes(normalized)) {
      chatIds.push(normalized);
      writeJson(this.chatFile, chatIds);
    }

    return chatIds;
  }

  getSeenListingIds() {
    return readJson(this.listingsFile, []);
  }

  markListingSeen(listingId) {
    const listingIds = this.getSeenListingIds();
    if (!listingIds.includes(listingId)) {
      listingIds.push(listingId);
      writeJson(this.listingsFile, listingIds);
    }
  }
}
