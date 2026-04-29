import { WohnungBot } from "./bot.js";
import { config } from "./config.js";
import { JsonStore } from "./storage.js";
import { TelegramClient } from "./telegram.js";

async function main() {
  const store = new JsonStore(config.dataDir);
  const telegram = new TelegramClient(config.token);
  const bot = new WohnungBot({ config, store, telegram });

  console.log("WohnungBot started.");
  console.log(`City filter: ${config.targetCity}`);
  console.log(`Max warm rent: ${config.maxWarmRent} EUR`);
  console.log(`Check interval: ${config.checkIntervalMinutes} minutes`);

  bot.scheduleChecks();
  await bot.pollUpdatesForever();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
