"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
const jwt_1 = require("../utils/jwt");
const env_1 = require("../config/env");
const email_service_1 = require("./email.service");
const formatAuthResponse = (user, token) => ({
    user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
    },
    token,
});
const hashToken = (token) => crypto_1.default.createHash('sha256').update(token).digest('hex');
class AuthService {
    static async signup(input) {
        const existing = await models_1.User.findOne({ email: input.email });
        if (existing) {
            throw new ApiError_1.ApiError(409, 'Email is already registered');
        }
        const user = await models_1.User.create({
            name: input.name,
            email: input.email,
            password: input.password,
            role: 'customer',
        });
        const token = (0, jwt_1.signToken)({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        });
        return formatAuthResponse(user, token);
    }
    static async login(input) {
        const user = await models_1.User.findOne({ email: input.email }).select('+password');
        if (!user) {
            throw new ApiError_1.ApiError(401, 'Invalid email or password');
        }
        const isMatch = await user.comparePassword(input.password);
        if (!isMatch) {
            throw new ApiError_1.ApiError(401, 'Invalid email or password');
        }
        const token = (0, jwt_1.signToken)({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        });
        return formatAuthResponse(user, token);
    }
    static async loginAdmin(input) {
        const result = await this.login(input);
        if (result.user.role !== 'admin') {
            throw new ApiError_1.ApiError(403, 'Admin access only');
        }
        return result;
    }
    static async getProfile(userId) {
        const user = await models_1.User.findById(userId);
        if (!user) {
            throw new ApiError_1.ApiError(404, 'User not found');
        }
        return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
        };
    }
    static async forgotPassword(email) {
        const user = await models_1.User.findOne({ email: email.toLowerCase() });
        const message = 'If that email exists, a verification code has been sent.';
        if (!user) {
            return { message };
        }
        const otp = String(crypto_1.default.randomInt(100000, 1000000));
        user.resetOtpHash = hashToken(otp);
        user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save({ validateBeforeSave: false });
        await email_service_1.EmailService.sendPasswordResetOtp(user.email, user.name, otp);
        if (env_1.env.nodeEnv === 'development') {
            console.log(`[dev] Password reset OTP for ${user.email}:`, otp);
        }
        return { message };
    }
    static async resetPassword(email, otp, password) {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await models_1.User.findOne({ email: normalizedEmail }).select('+password +resetOtpHash +resetOtpExpires');
        if (!user?.resetOtpHash || !user.resetOtpExpires) {
            throw new ApiError_1.ApiError(400, 'Invalid or expired verification code');
        }
        if (user.resetOtpExpires.getTime() < Date.now()) {
            throw new ApiError_1.ApiError(400, 'Verification code has expired');
        }
        if (hashToken(otp.trim()) !== user.resetOtpHash) {
            throw new ApiError_1.ApiError(400, 'Invalid verification code');
        }
        user.password = password;
        user.resetOtpHash = undefined;
        user.resetOtpExpires = undefined;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        return { message: 'Password updated successfully' };
    }
}
exports.AuthService = AuthService;
