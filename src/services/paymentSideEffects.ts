import { Types } from 'mongoose';
import { User } from '../models';
import { PaymentFinalizationService } from './paymentFinalization.service';

/** Email + cart clear must never block the verify HTTP response. */
export function runPaymentSuccessSideEffects(input: {
  paymentId: Types.ObjectId;
  orderId: Types.ObjectId;
  userId?: Types.ObjectId | null;
}): void {
  void (async () => {
    try {
      if (input.userId) {
        await User.updateOne({ _id: input.userId }, { $set: { cart: [] } });
      }
      await PaymentFinalizationService.sendPaymentConfirmationEmailOnce(
        input.paymentId,
        input.orderId
      );
    } catch (err) {
      console.error(
        '[payment] post-success side effects failed:',
        err instanceof Error ? err.message : err
      );
    }
  })();
}
