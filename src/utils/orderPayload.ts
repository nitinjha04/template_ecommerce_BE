import { IShippingAddress } from '../models/Order.model';

export type GuestOrderBody = {
  email: string;
  phone: string;
  shippingAddress: IShippingAddress & { phone?: string };
  paymentMethod: string;
  items: Array<{
    productId: string;
    quantity: number;
    size: string;
    color: string;
  }>;
  orderNote?: string;
};

/** Align guest checkout body with Order schema (single phone on order). */
export const normalizeGuestOrderBody = (body: GuestOrderBody) => {
  const phone = String(body.phone ?? body.shippingAddress?.phone ?? '').trim();
  const addr = body.shippingAddress;

  const shippingAddress: IShippingAddress = {
    firstName: addr.firstName.trim(),
    lastName: addr.lastName.trim(),
    street: addr.street.trim(),
    city: addr.city.trim(),
    state: addr.state.trim(),
    country: addr.country.trim(),
    postalCode: addr.postalCode.trim(),
    ...(addr.company?.trim() ? { company: addr.company.trim() } : {}),
  };

  const items = body.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    size: item.size?.trim() || 'One Size',
    color: item.color?.trim() || 'Default',
  }));

  return {
    email: body.email.trim(),
    phone,
    customerName: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
    shippingAddress,
    paymentMethod: body.paymentMethod,
    items,
    orderNote: body.orderNote?.trim() || undefined,
  };
};
