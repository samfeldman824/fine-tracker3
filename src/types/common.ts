// === Common Utility Types ===

// Generic API response wrapper
export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
  success: boolean;
};

// Loading states
export type LoadingState = "idle" | "loading" | "success" | "error";

// Pagination types
export type PaginationParams = {
  page: number;
  limit: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// Form validation types
export type FormErrors<T> = Partial<Record<keyof T, string>>;

// Select option type
export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

// Date range type
export type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

// Sort order type
export type SortOrder = "asc" | "desc";

// Table column type
export type TableColumn<T> = {
  key: keyof T;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
};

// Data table row type for fines
export type DataTableRow = {
  id: string;
  date: string | Date; // Date field - can be string or Date object
  fine_type: string;
  subject: string;
  description: string;
  amount: number;
  proposer: string;
  replies: number | string; // Replies field - could be count or string
};

// Form for adding fine
export type FineFormValues = {
  subject_id: string;
  description: string;
  amount: number;
};

// For for adding credit
export type CreditFormValues = {
  recipientId: string;
  description: string;
  amount: number;
}

// For fine type
export type FineType = "Fine" | "Credit" | "Warning";