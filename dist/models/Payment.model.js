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
exports.Payment = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const mongooseRefs_1 = require("../utils/mongooseRefs");
const PAYMENT_STATUSES = ['Completed', 'Pending', 'Failed'];
const paymentSchema = new mongoose_1.Schema({
    paymentNumber: {
        type: String,
        unique: true,
        required: true,
    },
    order: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        index: true,
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true,
    },
    method: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
        type: String,
        enum: PAYMENT_STATUSES,
        default: 'Pending',
    },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform(_doc, ret) {
            ret.id = String(ret._id);
            const orderRef = ret.order;
            if (orderRef != null) {
                if ((0, mongooseRefs_1.isPopulatedSubdoc)(orderRef)) {
                    ret.orderId = (0, mongooseRefs_1.refToIdString)(orderRef._id ?? orderRef.id ?? orderRef);
                    ret.order = {
                        orderNumber: orderRef.orderNumber,
                        total: orderRef.total,
                        status: orderRef.status,
                    };
                }
                else {
                    ret.orderId = (0, mongooseRefs_1.refToIdString)(orderRef);
                    delete ret.order;
                }
            }
            if (ret.user != null) {
                ret.userId = (0, mongooseRefs_1.refToIdString)(ret.user);
                delete ret.user;
            }
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
});
exports.Payment = mongoose_1.default.model('Payment', paymentSchema);
