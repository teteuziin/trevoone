import crypto from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import {
  validateProfileImageBuffer,
  type SupportedProfileImageMime,
} from "./profile-image";
import {
  writePrivateFile,
  deletePrivateFile,
  getPrivateStorageRoot,
  resolveSafeStoragePath,
} from "../storage/private-files";
import fs from "node:fs/promises";

export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  "admin",
  "administrator",
  "api",
  "app",
  "auth",
  "login",
  "logout",
  "conta",
  "consultoria",
  "consultorias",
  "trevo",
  "trevoone",
  "support",
  "suporte",
  "system",
  "platform",
  "root",
  "perfil",
  "seguranca",
  "null",
  "undefined",
]);

export type UserProfileData = {
  userId: number;
  userPublicId: string;
  fullName: string;
  email: string;
  customUsername: string | null;
  effectiveUsername: string; // e.g. "@matheus" or "@u_40b83db103d9..."
  hasProfilePhoto: boolean;
  profilePhotoMime: string | null;
  profilePhotoSizeBytes: number | null;
  profilePhotoUpdatedAt: Date | null;
};

export type UpdateUsernameResult = {
  success: boolean;
  error?: string;
  username?: string;
  effectiveUsername?: string;
};

export type UploadPhotoResult = {
  success: boolean;
  error?: string;
  effectiveUsername?: string;
  hasProfilePhoto?: boolean;
  profilePhotoUpdatedAt?: Date;
};

export type RemovePhotoResult = {
  success: boolean;
  error?: string;
};

/**
 * Encodes full 128-bit publicId into a deterministic, safe base64url handle with u_ prefix.
 * Preserves 100% entropy and never exposes numeric database IDs.
 */
export function computeEffectiveUsername(
  userPublicId: string,
  customUsername?: string | null
): string {
  if (customUsername && typeof customUsername === "string" && customUsername.trim()) {
    const clean = customUsername.trim().toLowerCase().replace(/^@+/, "");
    return `@${clean}`;
  }

  if (!userPublicId || typeof userPublicId !== "string" || !userPublicId.trim()) {
    return "@u_anonymous";
  }

  const cleanHex = userPublicId.trim().replace(/-/g, "").toLowerCase();
  if (/^[0-9a-f]{32}$/.test(cleanHex)) {
    const bytes = Buffer.from(cleanHex, "hex");
    const base64Url = bytes.toString("base64url");
    return `@u_${base64Url}`;
  }

  // Fallback for non-UUID strings: SHA-256 hash first 16 bytes encoded as base64url
  const hash = crypto.createHash("sha256").update(userPublicId.trim()).digest();
  const base64Url = hash.subarray(0, 16).toString("base64url");
  return `@u_${base64Url}`;
}

/**
 * Normalizes and strictly validates custom username.
 */
export function normalizeUsername(rawUsername: unknown): {
  normalized: string;
  valid: boolean;
  error?: string;
} {
  if (typeof rawUsername !== "string" || !rawUsername.trim()) {
    return {
      normalized: "",
      valid: false,
      error: "O nome de usuário não pode estar vazio.",
    };
  }

  const trimmed = rawUsername.trim();
  const stripped = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  const normalized = stripped.toLowerCase();

  // Length requirement: 3 to 30 characters
  if (normalized.length < 3 || normalized.length > 30) {
    return {
      normalized,
      valid: false,
      error: "O nome de usuário deve conter entre 3 e 30 caracteres.",
    };
  }

  // Allowed characters: lowercase letters (a-z), numbers (0-9), dots (.), underscores (_)
  if (!/^[a-z0-9._]+$/.test(normalized)) {
    return {
      normalized,
      valid: false,
      error: "O nome de usuário pode conter apenas letras minúsculas (a-z), números (0-9), ponto (.) e sublinhado (_).",
    };
  }

  // Must start and end with an alphanumeric character
  if (!/^[a-z0-9]/.test(normalized) || !/[a-z0-9]$/.test(normalized)) {
    return {
      normalized,
      valid: false,
      error: "O nome de usuário deve começar e terminar com uma letra ou número.",
    };
  }

  // Namespace protection: cannot start with u_ (reserved for auto-generated effective handles)
  if (normalized.startsWith("u_")) {
    return {
      normalized,
      valid: false,
      error: "O prefixo 'u_' é reservado pelo sistema e não pode ser utilizado.",
    };
  }

  // Cannot contain consecutive separators
  if (
    normalized.includes("..") ||
    normalized.includes("__") ||
    normalized.includes("._") ||
    normalized.includes("_.")
  ) {
    return {
      normalized,
      valid: false,
      error: "O nome de usuário não pode conter pontos ou sublinhados consecutivos.",
    };
  }

  // Reserved names check
  if (RESERVED_USERNAMES.has(normalized)) {
    return {
      normalized,
      valid: false,
      error: "Este nome de usuário é reservado pelo sistema e não pode ser utilizado.",
    };
  }

  return {
    normalized,
    valid: true,
  };
}

/**
 * Retrieves the profile of the authenticated user.
 * Read-only: never creates or mutates any row on pure read.
 */
export async function getMyProfile(
  userId: number,
  userPublicId?: string,
  fullName?: string,
  email?: string
): Promise<UserProfileData | null> {
  if (!userId || typeof userId !== "number" || userId <= 0) {
    return null;
  }

  let connection;
  try {
    connection = await getDbConnection();

    // 1. If basic user data is not provided, fetch it from users table
    let pubId = userPublicId;
    let name = fullName;
    let mail = email;

    if (!pubId || !name || !mail) {
      const [userRows] = await connection.execute<RowDataPacket[]>(
        `SELECT public_id, full_name, email
         FROM users
         WHERE id = ? AND status = 'ACTIVE' AND deleted_at IS NULL
         LIMIT 1;`,
        [userId]
      );

      if (!Array.isArray(userRows) || userRows.length === 0) {
        return null;
      }

      pubId = String(userRows[0].public_id);
      name = String(userRows[0].full_name);
      mail = String(userRows[0].email);
    }

    // 2. Fetch profile row if it exists
    const [profileRows] = await connection.execute<RowDataPacket[]>(
      `SELECT username, profile_photo_storage_key, profile_photo_mime,
              profile_photo_size_bytes, profile_photo_updated_at
       FROM user_profiles
       WHERE user_id = ?
       LIMIT 1;`,
      [userId]
    );

    let customUsername: string | null = null;
    let hasPhoto = false;
    let photoMime: string | null = null;
    let photoSizeBytes: number | null = null;
    let photoUpdatedAt: Date | null = null;

    if (Array.isArray(profileRows) && profileRows.length > 0) {
      const row = profileRows[0];
      customUsername = row.username ? String(row.username) : null;
      hasPhoto = Boolean(row.profile_photo_storage_key);
      photoMime = row.profile_photo_mime ? String(row.profile_photo_mime) : null;
      photoSizeBytes = row.profile_photo_size_bytes ? Number(row.profile_photo_size_bytes) : null;
      photoUpdatedAt = row.profile_photo_updated_at ? new Date(row.profile_photo_updated_at) : null;
    }

    const effectiveUsername = computeEffectiveUsername(pubId, customUsername);

    return {
      userId,
      userPublicId: pubId,
      fullName: name,
      email: mail,
      customUsername,
      effectiveUsername,
      hasProfilePhoto: hasPhoto,
      profilePhotoMime: photoMime,
      profilePhotoSizeBytes: photoSizeBytes,
      profilePhotoUpdatedAt: photoUpdatedAt,
    };
  } catch {
    return null;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Updates the custom username for the authenticated user.
 * Strictly binds mutation to current session userId with FOR UPDATE locking and duplicate key race handling.
 */
export async function updateMyUsername(
  userId: number,
  rawUsername: string
): Promise<UpdateUsernameResult> {
  if (!userId || typeof userId !== "number" || userId <= 0) {
    return { success: false, error: "Usuário inválido ou não autenticado." };
  }

  const { normalized, valid, error } = normalizeUsername(rawUsername);
  if (!valid) {
    return { success: false, error: error || "Nome de usuário inválido." };
  }

  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Verify user is active
    const [userRows] = await connection.execute<RowDataPacket[]>(
      `SELECT public_id FROM users WHERE id = ? AND status = 'ACTIVE' AND deleted_at IS NULL LIMIT 1;`,
      [userId]
    );

    if (!Array.isArray(userRows) || userRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Usuário não encontrado." };
    }

    const userPublicId = String(userRows[0].public_id);

    // 2. Lock profile row FOR UPDATE specifically by user_id
    const [profileRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, username FROM user_profiles WHERE user_id = ? FOR UPDATE;`,
      [userId]
    );

    if (Array.isArray(profileRows) && profileRows.length > 0) {
      // Row exists: update explicitly by user_id
      try {
        await connection.execute<ResultSetHeader>(
          `UPDATE user_profiles
           SET username = ?, updated_at = UTC_TIMESTAMP(3)
           WHERE user_id = ?;`,
          [normalized, userId]
        );
      } catch (err: unknown) {
        if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code: string }).code === "ER_DUP_ENTRY"
        ) {
          await connection.rollback();
          return { success: false, error: "Este @username já está em uso por outro usuário." };
        }
        throw err;
      }
    } else {
      // Row does not exist: insert new profile row
      const profilePublicId = crypto.randomUUID();
      try {
        await connection.execute<ResultSetHeader>(
          `INSERT INTO user_profiles (
             public_id, user_id, username, created_at, updated_at
           ) VALUES (
             ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3)
           );`,
          [profilePublicId, userId, normalized]
        );
      } catch (err: unknown) {
        if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code: string }).code === "ER_DUP_ENTRY"
        ) {
          await connection.rollback();
          return { success: false, error: "Este @username já está em uso por outro usuário." };
        }
        throw err;
      }
    }

    await connection.commit();
    const effectiveUsername = computeEffectiveUsername(userPublicId, normalized);

    return {
      success: true,
      username: normalized,
      effectiveUsername,
    };
  } catch {
    if (connection) await connection.rollback();
    return { success: false, error: "Erro interno ao atualizar nome de usuário. Tente novamente." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Uploads and securely replaces the profile photo for the authenticated user.
 * Validates buffer, writes to private storage, updates DB, deletes old file on success,
 * or compensates by deleting newly written file on DB failure.
 */
export async function uploadMyProfilePhoto(
  userId: number,
  fileBuffer: Buffer,
  clientMimeType?: string
): Promise<UploadPhotoResult> {
  if (!userId || typeof userId !== "number" || userId <= 0) {
    return { success: false, error: "Usuário inválido ou não autenticado." };
  }

  // 1. Strict format, magic bytes and dimension validation
  const validation = validateProfileImageBuffer(fileBuffer, clientMimeType);
  if (!validation.valid || !validation.mimeType || !validation.extension) {
    return {
      success: false,
      error: validation.error || "Arquivo de imagem inválido.",
    };
  }

  // 2. Write new file to private storage root under namespace profile-photos
  let writeResult;
  try {
    writeResult = await writePrivateFile({
      buffer: fileBuffer,
      extension: validation.extension,
      originalFileName: "avatar",
      namespace: "profile-photos",
    });
  } catch {
    return {
      success: false,
      error: "Falha ao salvar a imagem no armazenamento privado.",
    };
  }

  const newStorageKey = writeResult.fileStorageKey;
  const newSha256 = writeResult.fileSha256;
  const newSizeBytes = writeResult.sizeBytes;
  const newMimeType: SupportedProfileImageMime = validation.mimeType;

  let connection;
  let oldStorageKey: string | null = null;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // Verify user is active
    const [userRows] = await connection.execute<RowDataPacket[]>(
      `SELECT public_id FROM users WHERE id = ? AND status = 'ACTIVE' AND deleted_at IS NULL LIMIT 1;`,
      [userId]
    );

    if (!Array.isArray(userRows) || userRows.length === 0) {
      await connection.rollback();
      await deletePrivateFile(newStorageKey); // Compensate
      return { success: false, error: "Usuário não encontrado." };
    }

    const userPublicId = String(userRows[0].public_id);

    // Lock profile row FOR UPDATE
    const [profileRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, username, profile_photo_storage_key FROM user_profiles WHERE user_id = ? FOR UPDATE;`,
      [userId]
    );

    let customUsername: string | null = null;

    if (Array.isArray(profileRows) && profileRows.length > 0) {
      const row = profileRows[0];
      customUsername = row.username ? String(row.username) : null;
      oldStorageKey = row.profile_photo_storage_key ? String(row.profile_photo_storage_key) : null;

      await connection.execute<ResultSetHeader>(
        `UPDATE user_profiles
         SET profile_photo_storage_key = ?,
             profile_photo_mime = ?,
             profile_photo_size_bytes = ?,
             profile_photo_sha256 = ?,
             profile_photo_updated_at = UTC_TIMESTAMP(3),
             updated_at = UTC_TIMESTAMP(3)
         WHERE user_id = ?;`,
        [newStorageKey, newMimeType, newSizeBytes, newSha256, userId]
      );
    } else {
      const profilePublicId = crypto.randomUUID();
      await connection.execute<ResultSetHeader>(
        `INSERT INTO user_profiles (
           public_id, user_id, username,
           profile_photo_storage_key, profile_photo_mime, profile_photo_size_bytes,
           profile_photo_sha256, profile_photo_updated_at, created_at, updated_at
         ) VALUES (
           ?, ?, NULL,
           ?, ?, ?,
           ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), UTC_TIMESTAMP(3)
         );`,
        [profilePublicId, userId, newStorageKey, newMimeType, newSizeBytes, newSha256]
      );
    }

    await connection.commit();

    // 3. Delete old file best effort after successful DB commit
    if (oldStorageKey && oldStorageKey !== newStorageKey) {
      await deletePrivateFile(oldStorageKey);
    }

    const effectiveUsername = computeEffectiveUsername(userPublicId, customUsername);

    return {
      success: true,
      effectiveUsername,
      hasProfilePhoto: true,
      profilePhotoUpdatedAt: new Date(),
    };
  } catch {
    if (connection) await connection.rollback();
    // Compensate newly written file
    await deletePrivateFile(newStorageKey);
    return {
      success: false,
      error: "Falha ao registrar a foto de perfil. Tente novamente.",
    };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Removes the profile photo for the authenticated user.
 */
export async function removeMyProfilePhoto(userId: number): Promise<RemovePhotoResult> {
  if (!userId || typeof userId !== "number" || userId <= 0) {
    return { success: false, error: "Usuário inválido ou não autenticado." };
  }

  let connection;
  let oldStorageKey: string | null = null;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [profileRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, profile_photo_storage_key FROM user_profiles WHERE user_id = ? FOR UPDATE;`,
      [userId]
    );

    if (Array.isArray(profileRows) && profileRows.length > 0) {
      const row = profileRows[0];
      oldStorageKey = row.profile_photo_storage_key ? String(row.profile_photo_storage_key) : null;

      await connection.execute<ResultSetHeader>(
        `UPDATE user_profiles
         SET profile_photo_storage_key = NULL,
             profile_photo_mime = NULL,
             profile_photo_size_bytes = NULL,
             profile_photo_sha256 = NULL,
             profile_photo_updated_at = UTC_TIMESTAMP(3),
             updated_at = UTC_TIMESTAMP(3)
         WHERE user_id = ?;`,
        [userId]
      );
    }

    await connection.commit();

    if (oldStorageKey) {
      await deletePrivateFile(oldStorageKey);
    }

    return { success: true };
  } catch {
    if (connection) await connection.rollback();
    return { success: false, error: "Falha ao remover a foto de perfil." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Retrieves the raw photo binary buffer of the authenticated user for secure streaming.
 */
export async function getMyProfilePhotoBuffer(
  userId: number
): Promise<{ success: boolean; buffer?: Buffer; mimeType?: string; error?: string }> {
  if (!userId || typeof userId !== "number" || userId <= 0) {
    return { success: false, error: "Usuário inválido ou não autenticado." };
  }

  let connection;
  try {
    connection = await getDbConnection();

    const [profileRows] = await connection.execute<RowDataPacket[]>(
      `SELECT profile_photo_storage_key, profile_photo_mime
       FROM user_profiles
       WHERE user_id = ?
       LIMIT 1;`,
      [userId]
    );

    if (!Array.isArray(profileRows) || profileRows.length === 0) {
      return { success: false, error: "Foto de perfil não encontrada." };
    }

    const row = profileRows[0];
    const storageKey = row.profile_photo_storage_key ? String(row.profile_photo_storage_key) : null;
    const mimeType = row.profile_photo_mime ? String(row.profile_photo_mime) : "image/jpeg";

    if (!storageKey) {
      return { success: false, error: "Foto de perfil não configurada." };
    }

    const storageRoot = getPrivateStorageRoot();
    const targetPath = resolveSafeStoragePath(storageRoot, storageKey);
    const buffer = await fs.readFile(targetPath);

    return {
      success: true,
      buffer,
      mimeType,
    };
  } catch {
    return { success: false, error: "Não foi possível carregar a imagem do armazenamento." };
  } finally {
    if (connection) connection.release();
  }
}
