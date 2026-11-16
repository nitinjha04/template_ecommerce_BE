export class ApiError extends Error {
  statusCode: number;
  errors?: unknown[];
  /** Optional structured payload for clients (e.g. gateway diagnostics). */
  data?: unknown;

  constructor(
    statusCode: number,
    message: string,
    errors?: unknown[],
    data?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.data = data;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
