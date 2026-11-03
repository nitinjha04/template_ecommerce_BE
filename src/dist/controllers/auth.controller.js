"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const asyncHandler_1 = require("../utils/asyncHandler");
const ApiResponse_1 = require("../views/ApiResponse");
class AuthController {
    static signup = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const result = await auth_service_1.AuthService.signup(req.body);
        ApiResponse_1.ApiResponse.created(res, result, 'Account created successfully');
    });
    static login = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const result = await auth_service_1.AuthService.login(req.body);
        ApiResponse_1.ApiResponse.success(res, result, 'Logged in successfully');
    });
    static getMe = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const profile = await auth_service_1.AuthService.getProfile(req.user.userId);
        ApiResponse_1.ApiResponse.success(res, profile);
    });
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map