"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSareeV3Data = exports.loadLehengaV3Data = exports.loadMenV3Data = exports.parseV3File = exports.cleanScene7Url = exports.SAREE_FILE = exports.LEHENGA_FILE = exports.MEN_FILE = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const V3_DIR = path.join(__dirname);
exports.MEN_FILE = path.join(V3_DIR, 'wedding-men-data.txt');
exports.LEHENGA_FILE = path.join(V3_DIR, 'lehenga-women-data.txt');
exports.SAREE_FILE = path.join(V3_DIR, 'saree-women-data.txt');
/** Remove Scene7 size suffix e.g. `:283x395` at end of URL. */
const cleanScene7Url = (url) => {
    const trimmed = url.trim();
    if (!trimmed)
        return trimmed;
    return trimmed.replace(/:\d+x\d+$/i, '');
};
exports.cleanScene7Url = cleanScene7Url;
const isDataLine = (line) => {
    const t = line.trim();
    return t.startsWith('http://') || t.startsWith('https://');
};
const parseLine = (line, menFormat) => {
    const parts = line.split('\t').map((p) => p.trim());
    if (parts.length < 4 || !isDataLine(parts[0]))
        return null;
    const image1 = (0, exports.cleanScene7Url)(parts[0]);
    const image2 = (0, exports.cleanScene7Url)(parts[1]);
    const images = [image1, image2].filter(Boolean);
    const uniqueImages = [...new Set(images)];
    if (uniqueImages.length === 0)
        return null;
    let name = '';
    let tag;
    if (menFormat && parts.length >= 5) {
        tag = parts[2] || undefined;
        name = parts[3];
    }
    else {
        name = parts[2];
    }
    name = name.trim();
    if (!name || name.startsWith('http'))
        return null;
    return {
        images: uniqueImages,
        name,
        tag: tag?.trim() || undefined,
    };
};
const parseV3File = (filePath, menFormat = false) => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const rows = [];
    const seenNames = new Set();
    for (const line of content.split(/\r?\n/)) {
        if (!isDataLine(line))
            continue;
        const row = parseLine(line, menFormat);
        if (!row)
            continue;
        const key = row.name.toLowerCase();
        if (seenNames.has(key))
            continue;
        seenNames.add(key);
        rows.push(row);
    }
    return rows;
};
exports.parseV3File = parseV3File;
const loadMenV3Data = () => (0, exports.parseV3File)(exports.MEN_FILE, true);
exports.loadMenV3Data = loadMenV3Data;
const loadLehengaV3Data = () => (0, exports.parseV3File)(exports.LEHENGA_FILE, false);
exports.loadLehengaV3Data = loadLehengaV3Data;
const loadSareeV3Data = () => (0, exports.parseV3File)(exports.SAREE_FILE, false);
exports.loadSareeV3Data = loadSareeV3Data;
