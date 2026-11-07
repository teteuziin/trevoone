export interface EditorStudentInfo {
  membershipPublicId: string;
  name: string;
  email?: string;
  photoUrl?: string | null;
  objective?: string | null;
}

export type AutoSaveStatus = "saved" | "saving" | "error" | "idle";

export interface ActiveInsertTarget {
  blockPublicId: string;
  insertIndex?: number;
}

export type ActiveDrawerType =
  | null
  | "add"
  | "models"
  | "ai"
  | "reorder"
  | "finalize"
  | "preview"
  | "student-select";
