/** Result of every mock API write (`src/lib/api/*`). */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export function ok<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(error: string): ApiResult<T> {
  return { ok: false, error };
}
