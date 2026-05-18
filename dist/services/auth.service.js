"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
const jwt_1 = require("../utils/jwt");
const formatAuthResponse = (user, token) => ({
    user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
    },
    token,
});
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
}
exports.AuthService = AuthService;
