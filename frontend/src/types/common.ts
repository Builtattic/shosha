export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  ok: boolean;
  data: {
    items: T[];
    total: number;
    page: number;
    per_page: number;
    has_next: boolean;
  };
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
}
