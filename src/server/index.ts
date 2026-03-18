import { config } from "./config.js";
import { createApp } from "./app.js";
import { logger } from "./logger.js";

// Read package.json for app metadata
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, "../../package.json"), "utf-8"));

const app = createApp({ config, pkg });

function die(title: string) {
  return (err: unknown) => {
    logger.fatal({ err }, title);
    process.exit(1);
  };
}

process.on("uncaughtException", die("uncaughtException"));
process.on("unhandledRejection", die("unhandledRejection"));

logger.info({ config: { ...config, ADMIN_PASSWORD: "***", API_SECRET: "***" } }, "Starting");

app.listen(config.PORT, config.HOST, () => {
  logger.info(`App listening at http://${config.HOST}:${config.PORT}`);
});
