import { Request, Response } from 'express';
import { ContactService } from '../services/contact.service';
import { asyncHandler } from '../utils/asyncHandler';
import { getParamId } from '../utils/params';
import { ApiResponse } from '../views/ApiResponse';

export class ContactController {
  static create = asyncHandler(async (req: Request, res: Response) => {
    const message = await ContactService.create(req.body);
    ApiResponse.created(res, message, 'Message sent successfully');
  });

  static getAll = asyncHandler(async (_req: Request, res: Response) => {
    const messages = await ContactService.getAll();
    ApiResponse.success(res, messages);
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const message = await ContactService.getById(getParamId(req));
    ApiResponse.success(res, message);
  });

  static markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const message = await ContactService.markAsRead(getParamId(req), true);
    ApiResponse.success(res, message, 'Message marked as read');
  });

  static remove = asyncHandler(async (req: Request, res: Response) => {
    await ContactService.remove(getParamId(req));
    ApiResponse.success(res, null, 'Message deleted');
  });
}
