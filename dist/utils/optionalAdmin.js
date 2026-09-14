"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldIncludeUnpublished = exports.isAdminRequest = void 0;
const jwt_1 = require("./jwt");
/** True when request has a valid admin Bearer token. */
const isAdminRequest = (req) => {
    try {
        const header = req.headers.authorization;
        if (!header?.startsWith('Bearer '))
            return false;
        const user = (0, jwt_1.verifyToken)(header.split(' ')[1]);
        return user.role === 'admin';
    }
    catch {
        return false;
    }
};
exports.isAdminRequest = isAdminRequest;
/**
 * Unpublished products are only returned when the client explicitly requests
 * includeUnpublished=true AND sends a valid admin token (admin panel only).
 */
const shouldIncludeUnpublished = (req) => req.query.includeUnpublished === 'true' && (0, exports.isAdminRequest)(req);
exports.shouldIncludeUnpublished = shouldIncludeUnpublished;
