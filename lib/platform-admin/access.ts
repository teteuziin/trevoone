import type { RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";

export type PlatformAdminAccess = {
  isPlatformAdmin: boolean;
};

export async function getPlatformAdminAccess(
  userId: number
): Promise<PlatformAdminAccess> {
  if (!userId || typeof userId !== "number" || userId <= 0) {
    return { isPlatformAdmin: false };
  }

  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT status
       FROM platform_admins
       WHERE user_id = ?
       LIMIT 1;`,
      [userId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return { isPlatformAdmin: false };
    }

    const status = rows[0]?.status;
    return { isPlatformAdmin: status === "ACTIVE" };
  } catch {
    return { isPlatformAdmin: false };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
