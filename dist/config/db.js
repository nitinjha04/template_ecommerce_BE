"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env");
const category_service_1 = require("../services/category.service");
const connectDB = async () => {
    mongoose_1.default.set('strictQuery', true);
    await mongoose_1.default.connect(env_1.env.mongodbUri);
    console.log(`MongoDB connected: ${mongoose_1.default.connection.host}`);
    await category_service_1.CategoryService.ensureDefaults();
};
exports.connectDB = connectDB;
