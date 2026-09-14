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
 * Argen Style — Nykaa combined pool scrape (₹100–₹999 tiers, deduped by image).
 *
 *   npm run scrape:argen:pool
 *   npm run scrape:argen:pool -- --json-only --max-pages 30
 *   npm run scrape:argen:pool -- --dry-run
 */
const path = __importStar(require("path"));
const pool_config_1 = require("./pool-config");
const scrape_pool_1 = require("./scrape-pool");
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
const main = async () => {
    const args = parseArgs();
    const configPath = args.config?.trim() || path.join(__dirname, 'pool-config.json');
    const categoryMapPath = args['category-map']?.trim();
    const blocklistPath = args.blocklist?.trim();
    const config = (0, pool_config_1.loadPoolConfig)(configPath);
    const categoryMap = (0, scrape_pool_1.loadCategoryMapFile)(categoryMapPath);
    const result = await (0, scrape_pool_1.runPoolScrape)(config, categoryMap, {
        maxPages: Number(args['max-pages'] ?? '200'),
        dryRun: args['dry-run'] === 'true',
        jsonOnly: args['json-only'] === 'true',
        blocklistPath,
    });
    console.log('\n' + '='.repeat(60));
    console.log(`Status: ${result.status}`);
    console.log(`Pages: ${result.pagesFetched} | Scraped: ${result.totalScraped}/${result.totalRequested}`);
    if (!args['json-only']) {
        console.log(`Inserted: ${result.totalInserted}`);
    }
    if (result.error)
        console.log(`Error: ${result.error}`);
    console.log('='.repeat(60));
    if (result.status === 'failed')
        process.exit(1);
};
main().catch((err) => {
    console.error('Pool scrape failed:', err);
    process.exit(1);
});
