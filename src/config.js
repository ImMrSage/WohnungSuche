import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const ENV_PATH = path.join(ROOT_DIR, ".env");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

parseEnvFile(ENV_PATH);

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function numberEnv(name, fallback) {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolEnv(name, fallback) {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function listEnv(name) {
  const value = process.env[name];
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const config = {
  rootDir: ROOT_DIR,
  dataDir: path.join(ROOT_DIR, "data"),
  token: required("TELEGRAM_BOT_TOKEN"),
  checkIntervalMinutes: numberEnv("CHECK_INTERVAL_MINUTES", 10),
  targetCity: process.env.TARGET_CITY?.trim() || "Hamburg",
  maxWarmRent: numberEnv("MAX_WARM_RENT", 650),
  allowedChatIds: listEnv("TELEGRAM_ALLOWED_CHAT_IDS"),
  enableDemoSource: boolEnv("ENABLE_DEMO_SOURCE", true)
};
