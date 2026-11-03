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
/**
 * Re-import a previously saved scrape JSON (optional — scrape.ts imports by default).
 *
 * Usage:
 *   npm run scrape:nykaa:import -- --file src/scraping/output/tops-100-200.json
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const import_manifest_1 = require("./import-manifest");
const parseArgs = () => {
    const out = {};
    const argv = process.argv.slice(2);
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (!arg.startsWith('--'))
            continue;
        const key = arg.slice(2);
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) {
            out[key] = next;
            i += 1;
        }
        else {
            out[key] = 'true';
        }
    }
    return out;
};
const loadManifest = (filePath) => {
    const abs = path.resolve(filePath);
    if (!fs.existsSync(abs)) {
        throw new Error(`File not found: ${abs}`);
    }
    const parsed = JSON.parse(fs.readFileSync(abs, 'utf-8'));
    if (!parsed.products || !Array.isArray(parsed.products)) {
        throw new Error('JSON must contain a "products" array');
    }
    return parsed;
};
const main = async () => {
    const args = parseArgs();
    const file = args.file?.trim();
    if (!file) {
        console.error('Usage: npm run scrape:nykaa:import -- --file <path-to.json> [--dry-run]');
        process.exit(1);
    }
    const manifest = loadManifest(file);
    await (0, import_manifest_1.importManifest)(manifest, { dryRun: args['dry-run'] === 'true' });
    process.exit(0);
};
main().catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
});
