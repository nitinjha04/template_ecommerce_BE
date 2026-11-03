"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRouteParam = exports.getParamId = void 0;
const getParam = (req, key) => {
    const value = req.params[key];
    return Array.isArray(value) ? value[0] : (value ?? '');
};
const getParamId = (req) => getParam(req, 'id');
exports.getParamId = getParamId;
const getRouteParam = (req, key) => getParam(req, key);
exports.getRouteParam = getRouteParam;
