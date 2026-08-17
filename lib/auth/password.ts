import crypto from "node:crypto";

const SCRYPT_PARAMS = {
  cost: 32768, // N = 2^15
  blockSize: 8, // r = 8
  parallelization: 3, // p = 3
  maxmem: 64 * 1024 * 1024,
  keyLen: 64,
  saltLen: 16,
};

// Static well-formed dummy hash for non-existent users (prevents timing side-channel attacks)
// 16-byte salt base64url (22 chars), 64-byte key base64url (86 chars)
export const DUMMY_SCRYPT_HASH =
  "$scrypt$v=1$N=32768$r=8$p=3$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export function normalizeAuthEmail(rawEmail: string): string {
  return rawEmail.trim().normalize("NFC").toLowerCase();
}

export function isValidAuthEmail(email: string): boolean {
  const parts = email.split("@");
  return !(
    email.length === 0 ||
    email.length > 254 ||
    parts.length !== 2 ||
    !parts[0] ||
    !parts[1] ||
    !parts[1].includes(".")
  );
}

export function validatePasswordPolicy(password: string): { valid: boolean; error?: string } {
  if (typeof password !== "string") {
    return { valid: false, error: "Informe sua senha." };
  }

  const normalizedPassword = password.normalize("NFC");
  const passwordLen = [...normalizedPassword].length;

  if (passwordLen < 6) {
    return { valid: false, error: "Use pelo menos 6 caracteres na senha." };
  }

  if (passwordLen > 128) {
    return { valid: false, error: "A senha pode ter no máximo 128 caracteres." };
  }

  return { valid: true };
}

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

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  try {
    if (!storedHash || typeof storedHash !== "string") {
      return false;
    }

    const parts = storedHash.split("$");
    if (parts.length !== 8) {
      return false;
    }

    const [, algo, version, costStr, blockSizeStr, parallelStr, saltB64, hashB64] = parts;

    if (
      algo !== "scrypt" ||
      version !== "v=1" ||
      costStr !== `N=${SCRYPT_PARAMS.cost}` ||
      blockSizeStr !== `r=${SCRYPT_PARAMS.blockSize}` ||
      parallelStr !== `p=${SCRYPT_PARAMS.parallelization}` ||
      !saltB64 ||
      !hashB64
    ) {
      return false;
    }

    const salt = Buffer.from(saltB64, "base64url");
    const storedDerivedKey = Buffer.from(hashB64, "base64url");

    if (salt.length !== SCRYPT_PARAMS.saltLen || storedDerivedKey.length !== SCRYPT_PARAMS.keyLen) {
      return false;
    }

    const normalizedPassword = password.normalize("NFC");

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

    if (derivedKey.length !== storedDerivedKey.length) {
      return false;
    }

    return crypto.timingSafeEqual(derivedKey, storedDerivedKey);
  } catch {
    return false;
  }
}
