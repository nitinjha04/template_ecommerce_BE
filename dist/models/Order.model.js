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
exports.Order = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const orderItemSchema = new mongoose_1.Schema({
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    size: { type: String, required: true },
    color: { type: String, required: true },
    image: { type: String },
}, { _id: false });
const shippingAddressSchema = new mongoose_1.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    company: { type: String, default: "" },
    phone: { type: String },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    postalCode: { type: String, required: true },
}, { _id: false });
const ORDER_STATUSES = [
    "Pending",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled",
];
const orderSchema = new mongoose_1.Schema({
    orderNumber: {
        type: String,
        unique: true,
        required: true,
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: false,
        index: true,
    },
    customerName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    items: {
        type: [orderItemSchema],
        validate: [(v) => v.length > 0, "Order must have items"],
    },
    itemCount: { type: Number, required: true, min: 1 },
    total: { type: Number, required: true, min: 0 },
    status: {
        type: String,
        enum: ORDER_STATUSES,
        default: "Pending",
    },
    shippingAddress: {
        type: shippingAddressSchema,
        required: true,
    },
    paymentMethod: { type: String, required: true },
    orderNote: { type: String, default: "" },
    paymentInfo: {
        type: {
            paymentId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Payment" },
            paymentNumber: { type: String },
            status: { type: String, enum: ["Completed", "Pending", "Failed"] },
            amount: { type: Number, min: 0 },
            method: { type: String },
            provider: { type: String },
            paidAt: { type: Date },
            merchantOrderNo: { type: String },
            gatewayOrderNo: { type: String },
            utr: { type: String },
            gatewayStatus: { type: String },
            paidAmount: { type: Number, min: 0 },
        },
        _id: false,
    },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform(_doc, ret) {
            ret.id = String(ret._id);
            ret.userId = ret.user != null ? String(ret.user) : ret.user;
            delete ret._id;
            delete ret.__v;
            delete ret.user;
            return ret;
        },
    },
});
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ email: 1, createdAt: -1 });
orderSchema.index({ phone: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
exports.Order = mongoose_1.default.model("Order", orderSchema);
