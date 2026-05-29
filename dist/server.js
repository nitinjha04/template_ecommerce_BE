"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_dns_1 = __importDefault(require("node:dns"));
// Many hosts (Railway, Render, etc.) have no IPv6 egress; prefer IPv4 for SMTP and APIs.
node_dns_1.default.setDefaultResultOrder('ipv4first');
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const emailTransport_1 = require("./config/emailTransport");
const env_1 = require("./config/env");
const start = async () => {
    await (0, db_1.connectDB)();
    (0, emailTransport_1.logEmailStartup)();
    app_1.default.listen(env_1.env.port, () => {
        console.log(`Server running on port ${env_1.env.port} [${env_1.env.nodeEnv}]`);
        console.log(`API: http://localhost:${env_1.env.port}/api/v1`);
    });
};
start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
