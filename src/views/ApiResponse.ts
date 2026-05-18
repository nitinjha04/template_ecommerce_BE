import { Response } from 'express';

interface ApiResponseBody<T> {
  success: boolean;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;
  errors?: unknown[];
}

export class ApiResponse {
  static success<T>(
    res: Response,
    data: T,
    message = 'Success',
    statusCode = 200,
    meta?: Record<string, unknown>
  ): Response {
    const body: ApiResponseBody<T> = {
      success: true,
      message,
      data,
    };
    if (meta) body.meta = meta;
    return res.status(statusCode).json(body);
  }

  static created<T>(
    res: Response,
    data: T,
    message = 'Created successfully'
  ): Response {
    return ApiResponse.success(res, data, message, 201);
  }

  static error(
    res: Response,
    message: string,
    statusCode = 500,
    errors?: unknown[]
  ): Response {
    const body: ApiResponseBody<null> = {
      success: false,
      message,
    };
    if (errors) body.errors = errors;
    return res.status(statusCode).json(body);
  }
}
