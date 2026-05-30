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
const storeScope_1 = require("../utils/storeScope");
const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_VERIFIED_TTL_MS = 15 * 60 * 1000;
const formatAuthResponse = (user, token) => ({
    user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
    },
    token,
});
const hashToken = (token) => crypto_1.default.createHash("sha256").update(token).digest("hex");
const generateOtp = () => String(crypto_1.default.randomInt(100000, 1000000));
const normalizeEmail = (email) => email.toLowerCase().trim();
const isEmailVerified = (user) => user.role === "admin" || user.emailVerified !== false;
const assignSignupOtp = async (user) => {
    const otp = generateOtp();
    user.signupOtpHash = hashToken(otp);
    user.signupOtpExpires = new Date(Date.now() + OTP_TTL_MS);
    await user.save({ validateBeforeSave: false });
    await email_service_1.EmailService.sendSignupOtp(user.email, user.name, otp);
    if (!(0, env_1.isEmailEnabled)()) {
        console.log(`[dev] Signup OTP for ${user.email}:`, otp);
    }
};
const assignResetOtp = async (user) => {
    const otp = generateOtp();
    user.resetOtpHash = hashToken(otp);
    user.resetOtpExpires = new Date(Date.now() + OTP_TTL_MS);
    user.resetOtpVerifiedAt = undefined;
    await user.save({ validateBeforeSave: false });
    console.log("[forgot-password] Sending reset OTP email:", {
        to: user.email,
        emailEnabled: (0, env_1.isEmailEnabled)(),
    });
    (0, env_1.logEmailEnvDiagnostics)("assignResetOtp");
    try {
        await email_service_1.EmailService.sendPasswordResetOtp(user.email, user.name, otp);
        console.log("[forgot-password] Reset OTP email dispatched:", user.email);
    }
    catch (err) {
        console.error("[forgot-password] Reset OTP email failed:", {
            to: user.email,
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
        });
        throw err;
    }
    if (!(0, env_1.isEmailEnabled)()) {
        console.log(`[forgot-password][dev] Password reset OTP for ${user.email}:`, otp);
    }
};
class AuthService {
    static async signup(input) {
        const email = normalizeEmail(input.email);
        const existing = await models_1.User.findOne((0, storeScope_1.mergeStoreFilter)({ email })).select("+signupOtpHash +signupOtpExpires");
        // If user is already onboarded/verified, block re-signup.
        // If onboarding is incomplete (state 0), allow updating password + resending OTP.
        if (existing && (existing.onBoardState ?? 0) > 0) {
            throw new ApiError_1.ApiError(409, "Email is already registered");
        }
        let user = existing;
        if (user) {
            user.name = input.name.trim();
            user.password = input.password;
            user.emailVerified = false;
            user.onBoardState = 0;
            user.role = user.role || "customer";
            await user.save();
        }
        else {
            user = await models_1.User.create((0, storeScope_1.withStoreId)({
                name: input.name.trim(),
                email,
                password: input.password,
                role: "customer",
                emailVerified: false,
                onBoardState: 0,
            }));
        }
        await assignSignupOtp(user);
        return {
            message: "Verification code sent to your email.",
            email: user.email,
        };
    }
    static async verifySignupOtp(email, otp) {
        const normalizedEmail = normalizeEmail(email);
        const user = await models_1.User.findOne((0, storeScope_1.mergeStoreFilter)({ email: normalizedEmail })).select("+signupOtpHash +signupOtpExpires");
        if (!user) {
            throw new ApiError_1.ApiError(400, "Invalid or expired verification code");
        }
        if (user.emailVerified) {
            throw new ApiError_1.ApiError(400, "Email is already verified. Please sign in.");
        }
        if (!user.signupOtpHash || !user.signupOtpExpires) {
            throw new ApiError_1.ApiError(400, "Invalid or expired verification code");
        }
        if (user.signupOtpExpires.getTime() < Date.now()) {
            throw new ApiError_1.ApiError(400, "Verification code has expired");
        }
        if (hashToken(otp.trim()) !== user.signupOtpHash) {
            throw new ApiError_1.ApiError(400, "Invalid verification code");
        }
        user.emailVerified = true;
        user.onBoardState = 1;
        user.signupOtpHash = undefined;
        user.signupOtpExpires = undefined;
        await user.save({ validateBeforeSave: false });
        void email_service_1.EmailService.sendWelcomeEmail(user.email, user.name).catch((err) => console.error('[email] welcome:', err));
        const token = (0, jwt_1.signToken)({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        });
        return formatAuthResponse(user, token);
    }
    static async resendSignupOtp(email) {
        const normalizedEmail = normalizeEmail(email);
        const user = await models_1.User.findOne((0, storeScope_1.mergeStoreFilter)({ email: normalizedEmail }));
        const message = "If an account exists, a verification code has been sent.";
        if (!user || user.emailVerified || (user.onBoardState ?? 0) > 0) {
            return { message };
        }
        await assignSignupOtp(user);
        return { message, email: user.email };
    }
    static async login(input) {
        const user = await models_1.User.findOne((0, storeScope_1.mergeStoreFilter)({ email: normalizeEmail(input.email) })).select("+password");
        if (!user) {
            throw new ApiError_1.ApiError(401, "Invalid email or password");
        }
        const isMatch = await user.comparePassword(input.password);
        if (!isMatch) {
            throw new ApiError_1.ApiError(401, "Invalid email or password");
        }
        if (!isEmailVerified(user)) {
            throw new ApiError_1.ApiError(403, "Please verify your email before signing in. Check your inbox for the code.");
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
        if (result.user.role !== "admin") {
            throw new ApiError_1.ApiError(403, "Admin access only");
        }
        return result;
    }
    static async getProfile(userId) {
        const user = await models_1.User.findById(userId);
        if (!user) {
            throw new ApiError_1.ApiError(404, "User not found");
        }
        return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
        };
    }
    static async forgotPassword(email) {
        const normalizedEmail = normalizeEmail(email);
        console.log("[forgot-password] Looking up user:", { normalizedEmail });
        const user = await models_1.User.findOne((0, storeScope_1.mergeStoreFilter)({ email: normalizedEmail }));
        const message = "If that email exists, a verification code has been sent.";
        if (!user) {
            console.log("[forgot-password] No user for email (generic response):", {
                normalizedEmail,
            });
            return { message };
        }
        console.log("[forgot-password] User found, assigning OTP:", {
            userId: user._id.toString(),
            email: user.email,
        });
        await assignResetOtp(user);
        return { message, email: user.email };
    }
    static async verifyForgotPasswordOtp(email, otp) {
        const normalizedEmail = normalizeEmail(email);
        const user = await models_1.User.findOne((0, storeScope_1.mergeStoreFilter)({ email: normalizedEmail })).select("+resetOtpHash +resetOtpExpires");
        if (!user?.resetOtpHash || !user.resetOtpExpires) {
            throw new ApiError_1.ApiError(400, "Invalid or expired verification code");
        }
        if (user.resetOtpExpires.getTime() < Date.now()) {
            throw new ApiError_1.ApiError(400, "Verification code has expired");
        }
        if (hashToken(otp.trim()) !== user.resetOtpHash) {
            throw new ApiError_1.ApiError(400, "Invalid verification code");
        }
        user.resetOtpHash = undefined;
        user.resetOtpExpires = undefined;
        user.resetOtpVerifiedAt = new Date();
        await user.save({ validateBeforeSave: false });
        return {
            message: "Code verified. You can set a new password.",
            email: user.email,
        };
    }
    static async resetPassword(email, password) {
        const normalizedEmail = normalizeEmail(email);
        const user = await models_1.User.findOne((0, storeScope_1.mergeStoreFilter)({ email: normalizedEmail })).select("+password +resetOtpVerifiedAt");
        if (!user?.resetOtpVerifiedAt) {
            throw new ApiError_1.ApiError(400, "Please verify your email code first");
        }
        if (user.resetOtpVerifiedAt.getTime() <
            Date.now() - RESET_VERIFIED_TTL_MS) {
            throw new ApiError_1.ApiError(400, "Verification expired. Please request a new code.");
        }
        user.password = password;
        user.resetOtpVerifiedAt = undefined;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        void email_service_1.EmailService.sendPasswordChangedEmail(user.email, user.name).catch((err) => console.error("[email] password changed:", err));
        return { message: "Password updated successfully" };
    }
}
exports.AuthService = AuthService;
