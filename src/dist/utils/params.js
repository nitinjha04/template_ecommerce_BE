"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParamId = void 0;
const getParamId = (req) => {
    const id = req.params.id;
    return Array.isArray(id) ? id[0] : id;
};
exports.getParamId = getParamId;
//# sourceMappingURL=params.js.map