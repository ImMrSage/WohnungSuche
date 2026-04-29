import { evaluateListing, formatListingMessage } from "./filters.js";
import { fetchAllListings } from "./sources/index.js";

const STATUSES = new Set(["NEW", "OPENED", "APPLIED", "IGNORED"]);

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
          `Kriterium: Hamburg, Bruttokaltmiete bis ${this.config.maxBruttokaltRent} EUR`,
          `Fallback: Warmmiete bis ${this.config.maxWarmRent} EUR`
        ].join("\n")
      );
      return;
    }

    if (text === "/test") {
      await this.telegram.sendMessage(chatId, "Testnachricht: Telegram-Verbindung funktioniert.");
      return;
    }

    if (text === "/status") {
      const records = Object.values(this.store.getListingRecords());
      const savedChats = this.store.getChatIds().length;
      await this.telegram.sendMessage(
        chatId,
        [
          "Status",
          `Gespeicherte Chats: ${savedChats}`,
          `Gespeicherte Listings: ${records.length}`,
          `Stadt: ${this.config.targetCity}`,
          `Max Bruttokaltmiete: ${this.config.maxBruttokaltRent} EUR`,
          `Max Warmmiete fallback: ${this.config.maxWarmRent} EUR`,
          `Soft Warmmiete: ${this.config.softMaxWarmRent} EUR`,
          `Intervall: ${this.config.checkIntervalMinutes} Minuten`
        ].join("\n")
      );
      return;
    }

    if (text === "/summary") {
      await this.sendDailySummary(chatId);
      return;
    }

    if (text === "/scan") {
      const result = await this.scanAndNotify();
      await this.telegram.sendMessage(
        chatId,
        `Scan abgeschlossen. Gefunden: ${result.total}, neue Treffer: ${result.newMatches}, verschickt: ${result.sent}`
      );
    }
  }

  async handleCallbackQuery(callbackQuery) {
    const chatId = String(callbackQuery.message?.chat?.id || "");

    if (!this.isAllowedChat(chatId)) {
      await this.telegram.answerCallbackQuery(callbackQuery.id, {
        text: "Dieser Chat ist fuer den Bot nicht freigeschaltet."
      });
      return;
    }

    const data = String(callbackQuery.data || "");
    const [action, first, second] = data.split(":");

    if (action === "open") {
      const record = this.store.updateListingStatusByCallbackId(first, "OPENED");

      if (!record) {
        await this.telegram.answerCallbackQuery(callbackQuery.id, { text: "Listing nicht gefunden." });
        return;
      }

      await this.refreshListingMessages(record);
      try {
        await this.telegram.answerCallbackQuery(callbackQuery.id, { url: record.url });
      } catch {
        await this.telegram.answerCallbackQuery(callbackQuery.id, { text: "Als OPENED markiert. Link steht in der Nachricht." });
      }
      return;
    }

    if (action === "status" && STATUSES.has(first)) {
      const record = this.store.updateListingStatusByCallbackId(second, first);

      if (!record) {
        await this.telegram.answerCallbackQuery(callbackQuery.id, { text: "Listing nicht gefunden." });
        return;
      }

      await this.refreshListingMessages(record);
      await this.telegram.answerCallbackQuery(callbackQuery.id, { text: `Status: ${first}` });
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
          if (update.callback_query) {
            await this.handleCallbackQuery(update.callback_query);
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
      return { total: 0, newMatches: 0, sent: 0 };
    }

    this.scanInProgress = true;

    try {
      const listings = await fetchAllListings(this.config);
      const seenIds = new Set(this.store.getSeenListingIds());
      const chatIds = this.store.getChatIds();

      let sent = 0;
      let total = 0;
      let newMatches = 0;

      for (const listing of listings) {
        total += 1;

        if (!listing?.id || seenIds.has(listing.id)) {
          continue;
        }

        const evaluation = evaluateListing(listing, this.config);

        if (!evaluation.matches) {
          this.store.markListingSeen(listing.id);
          seenIds.add(listing.id);
          continue;
        }

        if (chatIds.length === 0) {
          continue;
        }

        const record = this.store.upsertListing(listing, evaluation);
        newMatches += 1;

        for (const chatId of chatIds) {
          const response = await this.telegram.sendMessage(chatId, formatListingMessage(record), {
            reply_markup: this.buildListingKeyboard(record)
          });
          this.store.saveMessageRef(record.id, chatId, response.message_id);
          sent += 1;
        }

        seenIds.add(listing.id);
      }

      return { total, newMatches, sent };
    } finally {
      this.scanInProgress = false;
    }
  }

  buildListingKeyboard(record) {
    return {
      inline_keyboard: [
        [{ text: "Open link", callback_data: `open:${record.callbackId}` }],
        [
          { text: "Mark opened", callback_data: `status:OPENED:${record.callbackId}` },
          { text: "Mark applied", callback_data: `status:APPLIED:${record.callbackId}` },
          { text: "Ignore", callback_data: `status:IGNORED:${record.callbackId}` }
        ]
      ]
    };
  }

  async refreshListingMessages(record) {
    const freshRecord = this.store.getListingRecord(record.id) || record;
    const text = formatListingMessage(freshRecord);
    const replyMarkup = this.buildListingKeyboard(freshRecord);

    for (const ref of freshRecord.messageRefs || []) {
      try {
        await this.telegram.editMessageText(ref.chatId, ref.messageId, text, {
          reply_markup: replyMarkup
        });
      } catch (error) {
        console.error(`Could not edit message ${ref.messageId}:`, error.message);
      }
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

    setInterval(async () => {
      try {
        await this.sendDailySummaryIfDue();
      } catch (error) {
        console.error("Daily summary error:", error.message);
      }
    }, 60 * 1000);
  }

  async sendDailySummaryIfDue() {
    const now = getLocalParts(this.config.timezone);
    const state = this.store.getSummaryState();

    if (now.hour !== this.config.dailySummaryHour || state.lastSummaryDate === now.date) {
      return;
    }

    for (const chatId of this.store.getChatIds()) {
      await this.sendDailySummary(chatId);
    }

    this.store.saveSummaryState({
      ...state,
      lastSummaryDate: now.date,
      lastSummaryAt: new Date().toISOString()
    });
  }

  async sendDailySummary(chatId) {
    const records = Object.values(this.store.getListingRecords());
    const today = getLocalParts(this.config.timezone).date;
    const newToday = records.filter((record) => getLocalDate(record.firstSeenAt, this.config.timezone) === today);
    const opened = records.filter((record) => record.status === "OPENED").length;
    const applied = records.filter((record) => record.status === "APPLIED").length;
    const bestMatches = records
      .filter((record) => record.status !== "IGNORED")
      .sort(compareBestMatches)
      .slice(0, 5);

    const lines = [
      "Daily summary",
      `New listings today: ${newToday.length}`,
      `Opened: ${opened}`,
      `Applied: ${applied}`,
      "",
      "Best matches:",
      ...bestMatches.map((record, index) => {
        const rent = record.price?.bruttokaltRent ?? record.price?.warmRent;
        const rentText = rent === undefined ? "unknown rent" : `${rent.toFixed(0)} EUR`;
        return `${index + 1}. ${record.listing?.title || record.url} - ${rentText} - ${record.status}`;
      })
    ];

    await this.telegram.sendMessage(chatId, lines.join("\n"));
  }
}

function compareBestMatches(a, b) {
  const priorityDiff = (a.priority || 99) - (b.priority || 99);
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  const aRent = a.price?.bruttokaltRent ?? a.price?.warmRent ?? 99999;
  const bRent = b.price?.bruttokaltRent ?? b.price?.warmRent ?? 99999;
  return aRent - bRent;
}

function getLocalParts(timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour)
  };
}

function getLocalDate(value, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
