"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializePayments = exports.serializePayment = void 0;
const mongooseRefs_1 = require("./mongooseRefs");
const serializePayment = (payment) => {
    const raw = payment.toObject({ virtuals: true });
    const orderRef = raw.order;
    let orderId = (0, mongooseRefs_1.refToIdString)(orderRef);
    let orderSummary;
    if ((0, mongooseRefs_1.isPopulatedSubdoc)(orderRef)) {
        orderId = (0, mongooseRefs_1.refToIdString)(orderRef._id ?? orderRef.id ?? orderRef);
        orderSummary = {
            orderNumber: typeof orderRef.orderNumber === 'string'
                ? orderRef.orderNumber
                : undefined,
            total: typeof orderRef.total === 'number' ? orderRef.total : undefined,
            status: typeof orderRef.status === 'string' ? orderRef.status : undefined,
        };
    }
    const userRef = raw.user;
    const userId = userRef != null ? (0, mongooseRefs_1.refToIdString)(userRef) : undefined;
    return {
        id: String(raw._id),
        paymentNumber: raw.paymentNumber,
        orderId,
        ...(orderSummary ? { order: orderSummary } : {}),
        ...(userId ? { userId } : {}),
        ...(raw.provider ? { provider: raw.provider } : {}),
        method: raw.method,
        amount: raw.amount,
        status: raw.status,
        ...(typeof raw?.gateway?.gatewayId === 'number'
            ? { gatewayId: raw.gateway.gatewayId }
            : {}),
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
    };
};
exports.serializePayment = serializePayment;
const serializePayments = (payments) => payments.map(exports.serializePayment);
exports.serializePayments = serializePayments;
