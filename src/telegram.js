const API_ROOT = "https://api.telegram.org";

export class TelegramClient {
  constructor(token) {
    this.token = token;
    this.baseUrl = `${API_ROOT}/bot${token}`;
  }

  async call(method, payload = {}) {
    const response = await fetch(`${this.baseUrl}/${method}`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Telegram API ${method} failed: ${response.status} ${text}`);
    }

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Telegram API ${method} returned ok=false`);
    }

    return data.result;
  }

  async getUpdates(offset) {
    return this.call("getUpdates", {
      offset,
      timeout: 20,
      allowed_updates: ["message", "callback_query"]
    });
  }

  async sendMessage(chatId, text, options = {}) {
    return this.call("sendMessage", {
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
      ...options
    });
  }

  async editMessageText(chatId, messageId, text, options = {}) {
    return this.call("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text,
      disable_web_page_preview: true,
      ...options
    });
  }

  async answerCallbackQuery(callbackQueryId, options = {}) {
    return this.call("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      ...options
    });
  }
}
