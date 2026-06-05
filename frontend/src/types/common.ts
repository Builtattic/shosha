export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** Cursor-based pagination — matches API spec §Global Conventions */
export interface CursorPage<T> {
  items: T[];
  next_cursor: string | null;
}

/** Legacy page-based pagination shape (kept for compat) */
export interface PaginatedResponse<T> {
  items: T[];
  next_cursor: string | null;
}

export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

