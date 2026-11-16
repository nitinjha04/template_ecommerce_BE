"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactController = void 0;
const contact_service_1 = require("../services/contact.service");
const asyncHandler_1 = require("../utils/asyncHandler");
const params_1 = require("../utils/params");
const ApiResponse_1 = require("../views/ApiResponse");
class ContactController {
    static create = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const message = await contact_service_1.ContactService.create(req.body);
        ApiResponse_1.ApiResponse.created(res, message, 'Message sent successfully');
    });
    static getAll = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
        const messages = await contact_service_1.ContactService.getAll();
        ApiResponse_1.ApiResponse.success(res, messages);
    });
    static getById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const message = await contact_service_1.ContactService.getById((0, params_1.getParamId)(req));
        ApiResponse_1.ApiResponse.success(res, message);
    });
    static markAsRead = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const message = await contact_service_1.ContactService.markAsRead((0, params_1.getParamId)(req), true);
        ApiResponse_1.ApiResponse.success(res, message, 'Message marked as read');
    });
    static remove = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        await contact_service_1.ContactService.remove((0, params_1.getParamId)(req));
        ApiResponse_1.ApiResponse.success(res, null, 'Message deleted');
    });
}
exports.ContactController = ContactController;
//# sourceMappingURL=contact.controller.js.map