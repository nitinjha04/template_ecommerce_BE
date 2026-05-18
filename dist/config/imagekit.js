"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getImageKit = void 0;
const imagekit_1 = __importDefault(require("imagekit"));
const env_1 = require("./env");
let imagekitClient = null;
const getImageKit = () => {
    if (!(0, env_1.isImageKitConfigured)()) {
        throw new Error('ImageKit is not configured. Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT in .env');
    }
    if (!imagekitClient) {
        imagekitClient = new imagekit_1.default({
            publicKey: env_1.env.imagekit.publicKey,
            privateKey: env_1.env.imagekit.privateKey,
            urlEndpoint: env_1.env.imagekit.urlEndpoint,
        });
    }
    return imagekitClient;
};
exports.getImageKit = getImageKit;
