export interface PaginationParams { page: number; limit: number; }
export interface PaginatedResponse<T> { data: T[]; total: number; page: number; limit: number; totalPages: number; }
export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams;
export function buildPaginatedResponse<T>(data: T[], total: number, params: PaginationParams): PaginatedResponse<T>;
