"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactService = void 0;
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
class ContactService {
    static async create(input) {
        return models_1.Contact.create(input);
    }
    static async getAll() {
        return models_1.Contact.find().sort({ createdAt: -1 });
    }
    static async getById(id) {
        const message = await models_1.Contact.findById(id);
        if (!message) {
            throw new ApiError_1.ApiError(404, 'Message not found');
        }
        return message;
    }
    static async markAsRead(id, read = true) {
        const message = await models_1.Contact.findByIdAndUpdate(id, { read }, { new: true });
        if (!message) {
            throw new ApiError_1.ApiError(404, 'Message not found');
        }
        return message;
    }
    static async remove(id) {
        const message = await models_1.Contact.findByIdAndDelete(id);
        if (!message) {
            throw new ApiError_1.ApiError(404, 'Message not found');
        }
        return { id };
    }
}
exports.ContactService = ContactService;
