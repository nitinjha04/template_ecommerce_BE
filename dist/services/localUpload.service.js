"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveFileLocally = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const env_1 = require("../config/env");
const UPLOAD_ROOT = path_1.default.join(process.cwd(), 'uploads');
const safeSegment = (value) => value.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
const saveFileLocally = async (file, folder = 'products') => {
    const safeFolder = safeSegment(folder) || 'products';
    const dir = path_1.default.join(UPLOAD_ROOT, safeFolder);
    await promises_1.default.mkdir(dir, { recursive: true });
    const ext = path_1.default.extname(file.originalname || '') || '.jpg';
    const base = safeSegment(path_1.default.basename(file.originalname || 'image', ext)) || 'image';
    const fileName = `${Date.now()}-${base}${ext}`;
    const diskPath = path_1.default.join(dir, fileName);
    await promises_1.default.writeFile(diskPath, file.buffer);
    const origin = (0, env_1.getApiPublicOrigin)();
    const url = `${origin}/uploads/${safeFolder}/${fileName}`;
    return { url, fileId: fileName, name: fileName };
};
exports.saveFileLocally = saveFileLocally;
