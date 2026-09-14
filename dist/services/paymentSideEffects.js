"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPaymentSuccessSideEffects = runPaymentSuccessSideEffects;
const models_1 = require("../models");
const paymentFinalization_service_1 = require("./paymentFinalization.service");
/** Email + cart clear must never block the verify HTTP response. */
function runPaymentSuccessSideEffects(input) {
    void (async () => {
        try {
            if (input.userId) {
                await models_1.User.updateOne({ _id: input.userId }, { $set: { cart: [] } });
            }
            await paymentFinalization_service_1.PaymentFinalizationService.sendPaymentConfirmationEmailOnce(input.paymentId, input.orderId);
        }
        catch (err) {
            console.error('[payment] post-success side effects failed:', err instanceof Error ? err.message : err);
        }
    })();
}
