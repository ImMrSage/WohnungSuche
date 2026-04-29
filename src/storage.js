import crypto from "node:crypto";
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

function callbackIdFor(listingId) {
  return crypto.createHash("sha1").update(String(listingId)).digest("hex").slice(0, 16);
}

export class JsonStore {
  constructor(dataDir) {
    this.chatFile = path.join(dataDir, "chat-ids.json");
    this.legacySeenFile = path.join(dataDir, "seen-listings.json");
    this.listingsFile = path.join(dataDir, "listings.json");
    this.summaryFile = path.join(dataDir, "summary-state.json");
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

  getListingRecords() {
    return readJson(this.listingsFile, {});
  }

  getListingRecord(listingId) {
    return this.getListingRecords()[listingId];
  }

  getListingByCallbackId(callbackId) {
    return Object.values(this.getListingRecords()).find((record) => record.callbackId === callbackId);
  }

  getSeenListingIds() {
    const legacyIds = readJson(this.legacySeenFile, []);
    return Array.from(new Set([...legacyIds, ...Object.keys(this.getListingRecords())]));
  }

  markListingSeen(listingId) {
    const listingIds = readJson(this.legacySeenFile, []);
    if (!listingIds.includes(listingId)) {
      listingIds.push(listingId);
      writeJson(this.legacySeenFile, listingIds);
    }
  }

  upsertListing(listing, evaluation) {
    const records = this.getListingRecords();
    const existing = records[listing.id];
    const now = new Date().toISOString();
    const record = {
      id: listing.id,
      callbackId: existing?.callbackId || callbackIdFor(listing.id),
      status: existing?.status || "NEW",
      listing: {
        ...existing?.listing,
        ...listing
      },
      url: listing.url,
      source: listing.source,
      price: evaluation.price,
      priority: evaluation.priority,
      matchReason: evaluation.reason,
      firstSeenAt: existing?.firstSeenAt || now,
      lastSeenAt: now,
      statusChangedAt: existing?.statusChangedAt || now,
      messageRefs: existing?.messageRefs || []
    };

    records[listing.id] = record;
    writeJson(this.listingsFile, records);

    return record;
  }

  saveMessageRef(listingId, chatId, messageId) {
    const records = this.getListingRecords();
    const record = records[listingId];

    if (!record) {
      return;
    }

    const ref = { chatId: String(chatId), messageId };
    const exists = record.messageRefs.some(
      (item) => item.chatId === ref.chatId && item.messageId === ref.messageId
    );

    if (!exists) {
      record.messageRefs.push(ref);
      writeJson(this.listingsFile, records);
    }
  }

  updateListingStatus(listingId, status) {
    const records = this.getListingRecords();
    const record = records[listingId];

    if (!record) {
      return undefined;
    }

    record.status = status;
    record.statusChangedAt = new Date().toISOString();
    writeJson(this.listingsFile, records);

    return record;
  }

  updateListingStatusByCallbackId(callbackId, status) {
    const record = this.getListingByCallbackId(callbackId);
    if (!record) {
      return undefined;
    }

    return this.updateListingStatus(record.id, status);
  }

  getSummaryState() {
    return readJson(this.summaryFile, {});
  }

  saveSummaryState(state) {
    writeJson(this.summaryFile, state);
  }
}
