"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseEmailFrom = void 0;
/** Parse `Name <email@example.com>` or plain `email@example.com`. */
const parseEmailFrom = (from) => {
    const trimmed = from.trim();
    const match = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
    if (match) {
        return { name: match[1].trim(), email: match[2].trim() };
    }
    return { name: '', email: trimmed };
};
exports.parseEmailFrom = parseEmailFrom;
