/**
 * Every DRF response on this backend is wrapped by
 * core.renderers.EnvelopeJSONRenderer:
 *   success responses -> { success: true, data: T }
 *   error responses   -> { success: false, error: { detail, code } }
 * (see backend/core/renderers.py, backend/core/exceptions.py)
 */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    detail: unknown;
    code: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/**
 * Shape returned by core.pagination.StandardResultsPagination.
 */
export interface Paginated<T> {
  count: number;
  num_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
