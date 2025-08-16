// === API Types ===

// Database query result types
export type FineWithUsersQuery = {
  id: string;
  date: string;
  description: string;
  amount: number;
  replies: number;
  offender: { name: string } | { name: string }[] | null;
  proposer: { name: string } | { name: string }[] | null;
};

// API function return types
export type GetFinesResult = {
  data: FineWithUsersQuery[] | null;
  error: string | null;
};

export type GetUsersResult = {
  data: { id: string; username: string; name: string | null }[] | null;
  error: string | null;
};

// Supabase response types
export type SupabaseResponse<T> = {
  data: T | null;
  error: any;
};
