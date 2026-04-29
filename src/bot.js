import { formatListingMessage, listingMatchesCriteria } from "./filters.js";
import { fetchAllListings } from "./sources/index.js";

export class WohnungBot {
  constructor({ config, store, telegram }) {
    this.config = config;
    this.store = store;
    this.telegram = telegram;
    this.updateOffset = undefined;
    this.scanInProgress = false;
  }

  isAllowedChat(chatId) {
    if (this.config.allowedChatIds.length === 0) {
      return true;
    }

    return this.config.allowedChatIds.includes(String(chatId));
  }

  async handleCommand(message) {
    const chatId = String(message.chat.id);
    const text = String(message.text || "").trim();

    if (!this.isAllowedChat(chatId)) {
      await this.telegram.sendMessage(chatId, "Dieser Chat ist fuer den Bot nicht freigeschaltet.");
      return;
    }

    if (text === "/start") {
      this.store.saveChatId(chatId);
      await this.telegram.sendMessage(
        chatId,
        [
          "Bot aktiviert.",
          `Chat-ID gespeichert: ${chatId}`,
          `Kriterium: Hamburg, Warmmiete bis ${this.config.maxWarmRent} EUR`
        ].join("\n")
      );
      return;
    }

    if (text === "/test") {
      await this.telegram.sendMessage(chatId, "Testnachricht: Telegram-Verbindung funktioniert.");
      return;
    }

    if (text === "/status") {
      const seenCount = this.store.getSeenListingIds().length;
      const savedChats = this.store.getChatIds().length;
      await this.telegram.sendMessage(
        chatId,
        [
          "Status",
          `Gespeicherte Chats: ${savedChats}`,
          `Bekannte Listings: ${seenCount}`,
          `Stadt: ${this.config.targetCity}`,
          `Max Warmmiete: ${this.config.maxWarmRent} EUR`,
          `Intervall: ${this.config.checkIntervalMinutes} Minuten`
        ].join("\n")
      );
      return;
    }

    if (text === "/scan") {
      const result = await this.scanAndNotify();
      await this.telegram.sendMessage(
        chatId,
        `Scan abgeschlossen. Gefunden: ${result.total}, verschickt: ${result.sent}`
      );
    }
  }

  async pollUpdatesForever() {
    for (;;) {
      try {
        const updates = await this.telegram.getUpdates(this.updateOffset);

        for (const update of updates) {
          this.updateOffset = update.update_id + 1;
          if (update.message?.text) {
            await this.handleCommand(update.message);
          }
        }
      } catch (error) {
        console.error("Polling error:", error.message);
        await sleep(5000);
      }
    }
  }

  async scanAndNotify() {
    if (this.scanInProgress) {
      return { total: 0, sent: 0 };
    }

    this.scanInProgress = true;

    try {
      const listings = await fetchAllListings(this.config);
      const seenIds = new Set(this.store.getSeenListingIds());
      const chatIds = this.store.getChatIds();

      let sent = 0;
      let total = 0;

      for (const listing of listings) {
        total += 1;

        if (!listing?.id || seenIds.has(listing.id)) {
          continue;
        }

        if (!listingMatchesCriteria(listing, this.config)) {
          this.store.markListingSeen(listing.id);
          seenIds.add(listing.id);
          continue;
        }

        const message = formatListingMessage(listing);

        for (const chatId of chatIds) {
          await this.telegram.sendMessage(chatId, message);
          sent += 1;
        }

        this.store.markListingSeen(listing.id);
        seenIds.add(listing.id);
      }

      return { total, sent };
    } finally {
      this.scanInProgress = false;
    }
  }

  scheduleChecks() {
    const intervalMs = this.config.checkIntervalMinutes * 60 * 1000;

    setInterval(async () => {
      try {
        const result = await this.scanAndNotify();
        if (result.sent > 0) {
          console.log(`Scheduled scan sent ${result.sent} messages.`);
        }
      } catch (error) {
        console.error("Scheduled scan error:", error.message);
      }
    }, intervalMs);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
