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
  