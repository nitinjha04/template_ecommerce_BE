import { Response } from 'express';
import { logEmailEnvDiagnostics } from '../config/env';
import { AuthService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../views/ApiResponse';
import { AuthRequest } from '../types';

export class AuthController {
  static signup = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await AuthService.signup(req.body);
    ApiResponse.created(res, result, result.message);
  });

  static verifySignupOtp = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await AuthService.verifySignupOtp(req.body.email, req.body.otp);
    ApiResponse.success(res, result, 'Email verified successfully');
  });

  static resendSignupOtp = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await AuthService.resendSignupOtp(req.body.email);
    ApiResponse.success(res, result, result.message);
  });

  static login = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await AuthService.login(req.body);
    ApiResponse.success(res, result, 'Logged in successfully');
  });

  static loginAdmin = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await AuthService.loginAdmin(req.body);
    ApiResponse.success(res, result, 'Admin logged in successfully');
  });

  static getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
    const profile = await AuthService.getProfile(req.user!.userId);
    ApiResponse.success(res, profile);
  });

  static forgotPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    const email = req.body.email as string;
    console.log('[forgot-password] Request received:', { email });
    logEmailEnvDiagnostics('forgot-password');
    try {
      const result = await AuthService.forgotPassword(email);
      console.log('[forgot-password] Completed:', {
        email,
        userFound: Boolean(result.email),
      });
      ApiResponse.success(res, result, result.message);
    } catch (err) {
      console.error('[forgot-password] Failed:', {
        email,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    }
  });

  static verifyForgotPasswordOtp = asyncHandler(
    async (req: AuthRequest, res: Response) => {
      const result = await AuthService.verifyForgotPasswordOtp(
        req.body.email,
        req.body.otp
      );
      ApiResponse.success(res, result, result.message);
    }
  );

  static resetPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await AuthService.resetPassword(
      req.body.email,
      req.body.password
    );
    ApiResponse.success(res, result, result.message);
  });
}
