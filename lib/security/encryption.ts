import crypto from "node:crypto";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const KEY_LENGTH_BYTES = 32;
const ENVELOPE_VERSION = "v1";

function getEncryptionKey(): Buffer {
  const envKey = process.env.TREVOONE_DATA_ENCRYPTION_KEY;
  if (!envKey || typeof envKey !== "string") {
    throw new Error("Configuração de criptografia segura indisponível.");
  }

  const trimmedKey = envKey.trim();
  const keyBuffer = Buffer.from(trimmedKey, "base64");
  if (keyBuffer.length !== KEY_LENGTH_BYTES) {
    throw new Error("Chave de criptografia inválida: comprimento incorreto.");
  }

  return keyBuffer;
}

/**
 * Encrypts a sensitive string (e.g. PIX key) using AES-256-GCM with a random IV.
 * Returns a versioned envelope string: v1:<base64-iv>:<base64-authTag>:<base64-ciphertext>
 */
export function encryptText(plaintext: string): string {
  if (!plaintext || typeof plaintext !== "string") {
    throw new Error("Conteúdo inválido para criptografia.");
  }

  const keyBuffer = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, keyBuffer, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return `${ENVELOPE_VERSION}:${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

/**
 * Decrypts a sensitive envelope string using AES-256-GCM.
 * If the value is legacy plaintext (does not start with 'v1:'), returns it as-is for backward compatibility.
 */
export function decryptText(storedValue: string): string {
  if (!storedValue || typeof storedValue !== "string") {
    return "";
  }

  // Backward compatibility: If not starting with envelope version, return as-is
  if (!storedValue.startsWith(`${ENVELOPE_VERSION}:`)) {
    return storedValue;
  }

  const parts = storedValue.split(":");
  if (parts.length !== 4 || parts[0] !== ENVELOPE_VERSION) {
    throw new Error("Formato de envelope de criptografia inválido.");
  }

  const [, ivB64, authTagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  if (iv.length !== IV_LENGTH_BYTES) {
    throw new Error("IV de criptografia corrompido ou inválido.");
  }
  if (authTag.length !== AUTH_TAG_LENGTH_BYTES) {
    throw new Error("Tag de autenticação corrompida ou inválida.");
  }

  const keyBuffer = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, keyBuffer, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    throw new Error("Falha na autenticação ou decriptografia dos dados protegidos.");
  }
}

/**
 * Checks if a stored value matches the encrypted envelope pattern.
 */
export function isEncryptedText(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  return value.startsWith(`${ENVELOPE_VERSION}:`);
}

// Domain-specific aliases for PIX keys
export const encryptPixKey = encryptText;
export const decryptPixKey = decryptText;
export const isEncryptedPixKey = isEncryptedText;
