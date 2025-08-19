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

// === Comments ===
export type Comment = Tables<"comments">;
export type CommentInsert = TablesInsert<"comments">;
export type CommentUpdate = TablesUpdate<"comments">;

// === Extended Types for UI ===
export type UserSelect = Pick<User, "user_id" | "username" | "name">;

// === Composite Types ===
export type FineWithUsers = Fine & {
  offender: UserSelect;
  proposedBy: UserSelect;
};

// Comment with author information
export type CommentWithAuthor = Comment & {
  author: UserSelect;
};

// Hierarchical comment structure
export type CommentWithReplies = CommentWithAuthor & {
  replies: CommentWithReplies[];
  reply_count: number;
};

// === Form Types ===
export type AddFineFormData = {
  subject_id: string;
  description: string;
  amount: number;
  date: string;
};

export type AddCreditFormData = {
  recipient_id: string;
  description: string;
  amount: number;
};

// === Comment Form Types ===
export type CommentFormData = {
  content: string;
  fine_id: string;
  parent_comment_id?: string;
};

// === Comment API Response Types ===
export type CommentsResponse = {
  comments: CommentWithReplies[];
  total_count: number;
};
  