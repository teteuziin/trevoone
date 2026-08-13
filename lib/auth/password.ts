import crypto from "node:crypto";

const SCRYPT_PARAMS = {
  cost: 32768, // N = 2^15
  blockSize: 8, // r = 8
  parallelization: 3, // p = 3
  maxmem: 64 * 1024 * 1024,
  keyLen: 64,
  saltLen: 16,
};

export async function hashPassword(password: string): Promise<string> {
  const normalizedPassword = password.normalize("NFC");
  const salt = crypto.randomBytes(SCRYPT_PARAMS.saltLen);

  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(
      normalizedPassword,
      salt,
      SCRYPT_PARAMS.keyLen,
      {
        cost: SCRYPT_PARAMS.cost,
        blockSize: SCRYPT_PARAMS.blockSize,
        parallelization: SCRYPT_PARAMS.parallelization,
        maxmem: SCRYPT_PARAMS.maxmem,
      },
      (err, key) => {
        if (err) reject(err);
        else resolve(key);
      }
    );
  });

  const saltB64 = salt.toString("base64url");
  const hashB64 = derivedKey.toString("base64url");

  const formattedHash = `$scrypt$v=1$N=${SCRYPT_PARAMS.cost}$r=${SCRYPT_PARAMS.blockSize}$p=${SCRYPT_PARAMS.parallelization}$${saltB64}$${hashB64}`;

  if (formattedHash.length > 255) {
    throw new Error("Password hash length exceeds VARCHAR(255) column limit.");
  }

  return formattedHash;
}
