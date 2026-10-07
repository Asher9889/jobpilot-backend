import envConfig  from "../config/envConfig.ts";
import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";

// console.log("TELEGRAM_SESSION_ENCRYPTION_KEY:", envConfig.telegram.sessionEncryptionKey);

const key = Buffer.from(process.env.TELEGRAM_SESSION_ENCRYPTION_KEY!, "base64");
// const key = Buffer.from(envConfig.telegram.sessionEncryptionKey, "base64");

if (key.length !== 32) {
    throw new Error("TELEGRAM_SESSION_ENCRYPTION_KEY must be 32 bytes");
}

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv,);

    const encrypted = Buffer.concat([
        cipher.update(text, "utf8"),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
        iv.toString("base64"),
        authTag.toString("base64"),
        encrypted.toString("base64"),
    ].join(".");
}

export function decrypt(payload: string): string {
    const [ivBase64, authTagBase64, encryptedBase64] =
        payload.split(".");

    if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
        throw new Error("Invalid encrypted payload");
    }

    const iv = Buffer.from(ivBase64, "base64");
    const authTag = Buffer.from(authTagBase64, "base64");
    const encrypted = Buffer.from(encryptedBase64, "base64");

    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        iv,
    );

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
    ]);

    return decrypted.toString("utf8");
}