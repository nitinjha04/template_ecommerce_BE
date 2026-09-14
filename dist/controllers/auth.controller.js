"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const env_1 = require("../config/env");
const auth_service_1 = require("../services/auth.service");
const asyncHandler_1 = require("../utils/asyncHandler");
const ApiResponse_1 = require("../views/ApiResponse");
class AuthController {
    static signup = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const result = await auth_service_1.AuthService.signup(req.body);
        ApiResponse_1.ApiResponse.created(res, result, result.message);
    });
    static verifySignupOtp = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const result = await auth_service_1.AuthService.verifySignupOtp(req.body.email, req.body.otp);
        ApiResponse_1.ApiResponse.success(res, result, 'Email verified successfully');
    });
    static resendSignupOtp = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const result = await auth_service_1.AuthService.resendSignupOtp(req.body.email);
        ApiResponse_1.ApiResponse.success(res, result, result.message);
    });
    static login = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const result = await auth_service_1.AuthService.login(req.body);
        ApiResponse_1.ApiResponse.success(res, result, 'Logged in successfully');
    });
    static loginAdmin = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const result = await auth_service_1.AuthService.loginAdmin(req.body);
        ApiResponse_1.ApiResponse.success(res, result, 'Admin logged in successfully');
    });
    static getMe = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const profile = await auth_service_1.AuthService.getProfile(req.user.userId);
        ApiResponse_1.ApiResponse.success(res, profile);
    });
    static forgotPassword = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const email = req.body.email;
        console.log('[forgot-password] Request received:', { email });
        (0, env_1.logEmailEnvDiagnostics)('forgot-password');
        try {
            const result = await auth_service_1.AuthService.forgotPassword(email);
            console.log('[forgot-password] Completed:', {
                email,
                userFound: Boolean(result.email),
            });
            ApiResponse_1.ApiResponse.success(res, result, result.message);
        }
        catch (err) {
            console.error('[forgot-password] Failed:', {
                email,
                error: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : undefined,
            });
            throw err;
        }
    });
    static verifyForgotPasswordOtp = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const result = await auth_service_1.AuthService.verifyForgotPasswordOtp(req.body.email, req.body.otp);
        ApiResponse_1.ApiResponse.success(res, result, result.message);
    });
    static resetPassword = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const result = await auth_service_1.AuthService.resetPassword(req.body.email, req.body.password);
        ApiResponse_1.ApiResponse.success(res, result, result.message);
    });
}
exports.AuthController = AuthController;
