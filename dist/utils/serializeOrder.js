"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeLeanOrder = exports.serializeOrder = exports.resolveOrderPayment = void 0;
const serializePaymentInfoForClient = (info) => {
    if (!info)
        return undefined;
    return {
        paymentId: String(info.paymentId),
        paymentNumber: info.paymentNumber,
        status: info.status,
        amount: info.amount,
        method: info.method,
        provider: info.provider,
        paidAt: info.paidAt instanceof Date
            ? info.paidAt.toISOString()
            : info.paidAt
                ? String(info.paidAt)
                : undefined,
        merchantOrderNo: info.merchantOrderNo,
        gatewayOrderNo: info.gatewayOrderNo ?? info.utr,
        utr: info.utr,
        gatewayStatus: info.gatewayStatus,
        paidAmount: info.paidAmount,
        isPaid: info.status === 'Completed',
    };
};
const paymentFromSnapshot = (info) => ({
    id: String(info.paymentId),
    paymentNumber: info.paymentNumber,
    status: info.status,
    amount: info.amount,
    method: info.method,
    provider: info.provider,
    paidAt: info.paidAt instanceof Date
        ? info.paidAt.toISOString()
        : info.paidAt
            ? String(info.paidAt)
            : undefined,
    merchantOrderNo: info.merchantOrderNo,
    gatewayOrderNo: info.gatewayOrderNo ?? info.utr,
    isPaid: info.status === 'Completed',
});
const paymentFromDocument = (payment) => ({
    id: String(payment._id),
    paymentNumber: payment.paymentNumber,
    status: payment.status,
    amount: payment.amount,
    method: payment.method,
    provider: payment.provider,
    paidAt: payment.paidAt?.toISOString(),
    merchantOrderNo: payment.gateway?.merchantOrderNo,
    gatewayOrderNo: payment.gateway?.gatewayOrderNo,
    paymentUrl: payment.status !== 'Completed' ? payment.gateway?.payUrlH5 : undefined,
    isPaid: payment.status === 'Completed',
});
const resolveOrderPayment = (order, latestPayment) => {
    const fromSnap = order.paymentInfo
        ? paymentFromSnapshot(order.paymentInfo)
        : undefined;
    const fromDoc = latestPayment ? paymentFromDocument(latestPayment) : undefined;
    if (fromSnap?.isPaid)
        return fromSnap;
    if (fromDoc?.isPaid)
        return fromDoc;
    if (fromSnap)
        return fromSnap;
    if (fromDoc)
        return fromDoc;
    return undefined;
};
exports.resolveOrderPayment = resolveOrderPayment;
const serializeOrder = (order, latestPayment) => {
    const raw = order.toObject ? order.toObject({ virtuals: true }) : order;
    const doc = raw;
    const paymentInfo = doc.paymentInfo;
    return {
        id: String(doc._id ?? doc.id),
        orderNumber: String(doc.orderNumber),
        userId: doc.user != null ? String(doc.user) : undefined,
        customerName: String(doc.customerName),
        email: String(doc.email),
        phone: String(doc.phone),
        items: doc.items,
        itemCount: Number(doc.itemCount),
        total: Number(doc.total),
        status: doc.status,
        shippingAddress: doc.shippingAddress,
        paymentMethod: String(doc.paymentMethod),
        orderNote: doc.orderNote ? String(doc.orderNote) : undefined,
        paymentInfo: serializePaymentInfoForClient(paymentInfo),
        payment: (0, exports.resolveOrderPayment)({ paymentInfo }, latestPayment),
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
};
exports.serializeOrder = serializeOrder;
const serializeLeanOrder = (doc, latestPayment) => {
    const paymentInfo = doc.paymentInfo;
    return {
        id: String(doc._id),
        orderNumber: String(doc.orderNumber),
        userId: doc.user != null ? String(doc.user) : undefined,
        customerName: String(doc.customerName),
        email: String(doc.email),
        phone: String(doc.phone),
        items: doc.items,
        itemCount: Number(doc.itemCount),
        total: Number(doc.total),
        status: doc.status,
        shippingAddress: doc.shippingAddress,
        paymentMethod: String(doc.paymentMethod),
        orderNote: doc.orderNote ? String(doc.orderNote) : undefined,
        paymentInfo: serializePaymentInfoForClient(paymentInfo),
        payment: (0, exports.resolveOrderPayment)({ paymentInfo }, latestPayment ?? undefined),
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
};
exports.serializeLeanOrder = serializeLeanOrder;
