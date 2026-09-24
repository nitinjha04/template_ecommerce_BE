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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userSchema = new mongoose_1.Schema({
    store: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: 120,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6,
        select: false,
    },
    role: {
        type: String,
        enum: ['customer', 'admin'],
        default: 'customer',
    },
    emailVerified: {
        type: Boolean,
        default: false,
    },
    onBoardState: {
        type: Number,
        default: 0,
        min: 0,
    },
    signupOtpHash: { type: String, select: false },
    signupOtpExpires: { type: Date, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    resetOtpHash: { type: String, select: false },
    resetOtpExpires: { type: Date, select: false },
    resetOtpVerifiedAt: { type: Date, select: false },
    wishlist: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' }],
    cart: [
        {
            product: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product', required: true },
            quantity: { type: Number, required: true, min: 1 },
            size: { type: String, required: true, trim: true, default: 'One Size' },
            color: { type: String, required: true, trim: true, default: 'Default' },
        },
    ],
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform(_doc, ret) {
            ret.id = String(ret._id);
            delete ret._id;
            delete ret.__v;
            delete ret.password;
            return ret;
        },
    },
});
userSchema.index({ store: 1, email: 1 }, { unique: true });
userSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    this.password = await bcryptjs_1.default.hash(this.password, 12);
    next();
});
userSchema.methods.comparePassword = async function (candidate) {
    return bcryptjs_1.default.compare(candidate, this.password);
};
exports.User = mongoose_1.default.model('User', userSchema);
