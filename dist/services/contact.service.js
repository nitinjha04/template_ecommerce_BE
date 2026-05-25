"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactService = void 0;
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
const pagination_1 = require("../utils/pagination");
class ContactService {
    static async create(input) {
        return models_1.Contact.create(input);
    }
    static async getAllAdmin(query) {
        const { page, limit, skip } = (0, pagination_1.parsePagination)(query);
        const filter = {};
        const regex = (0, pagination_1.searchRegex)(query.search ?? '');
        if (regex) {
            filter.$or = [
                { name: regex },
                { email: regex },
                { subject: regex },
                { message: regex },
            ];
        }
        const [items, total] = await Promise.all([
            models_1.Contact.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            models_1.Contact.countDocuments(filter),
        ]);
        return {
            items,
            pagination: (0, pagination_1.buildPaginationMeta)(page, limit, total),
        };
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
