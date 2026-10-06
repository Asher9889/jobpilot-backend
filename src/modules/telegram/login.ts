import "node:process";
import { TelegramClient } from "teleproto";
import { StoreSession } from "teleproto/sessions";
import { createInterface } from "node:readline/promises";
import envConfig from "../../config/envConfig.ts";

const apiId = envConfig.telegram.apiId;
const apiHash = envConfig.telegram.apiHash;

// Disk-backed session — persists under ./bot-session/
const session = new StoreSession("agent-session");

const rl = createInterface({ input: process.stdin, output: process.stdout });
const client = new TelegramClient(session, apiId, apiHash, {
  connectionRetries: 5,
});

await client.start({
  phoneNumber: () => rl.question("Phone: "),
  password:    () => rl.question("2FA password: "),
  phoneCode:   () => rl.question("Code: "),
  onError: console.error,
});

console.log(await client.getMe());
console.log("Session string:", client.session.save());

rl.close();