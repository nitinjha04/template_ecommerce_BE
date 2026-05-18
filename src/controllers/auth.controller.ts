import { Response } from 'express';
import { AuthService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../views/ApiResponse';
import { AuthRequest } from '../types';

export class AuthController {
  static signup = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await AuthService.signup(req.body);
    ApiResponse.created(res, result, 'Account created successfully');
  });

  static login = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await AuthService.login(req.body);
    ApiResponse.success(res, result, 'Logged in successfully');
  });

  static getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
    const profile = await AuthService.getProfile(req.user!.userId);
    ApiResponse.success(res, profile);
  });
}
