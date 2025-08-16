import type {
  Tables,
  TablesInsert,
  TablesUpdate
} from "@/types/supabase";

// === Fines ===
export type Fine = Tables<"fines">;
export type FineInsert = TablesInsert<"fines">;
export type FineUpdate = TablesUpdate<"fines">;

// === Users ===
export type User = Tables<"users">;
export type UserInsert = TablesInsert<"users">;
export type UserUpdate = TablesUpdate<"users">;

// === Extended Types for UI ===
export type UserSelect = Pick<User, "id" | "username" | "name">;

// === Composite Types ===
export type FineWithUsers = Fine & {
  offender: UserSelect;
  proposedBy: UserSelect;
};

// === Form Types ===
export type AddFineFormData = {
  offender_id: string;
  description: string;
  amount: number;
  date: string;
};

export type AddCreditFormData = {
  recipient_id: string;
  description: string;
  amount: number;
};
  