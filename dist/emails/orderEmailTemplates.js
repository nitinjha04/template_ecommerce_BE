"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderStatusUpdatedEmail = exports.orderPlacedAdminEmail = exports.orderPlacedBuyerEmail = void 0;
const formatAddress = (order) => {
    const a = order.shippingAddress;
    return [
        `${a.firstName} ${a.lastName}`,
        a.street,
        `${a.city}, ${a.state} ${a.postalCode}`,
        a.country,
        `Phone: ${a.phone || order.phone}`,
    ].join('<br/>');
};
const formatItemsTable = (order) => {
    const rows = order.items
        .map((item) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${item.name}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${item.color} / ${item.size}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${(item.price * item.quantity).toFixed(2)}</td>
      </tr>`)
        .join('');
    return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="background:#f5f5f5;">
          <th style="padding:8px;text-align:left;">Product</th>
          <th style="padding:8px;text-align:left;">Variant</th>
          <th style="padding:8px;text-align:center;">Qty</th>
          <th style="padding:8px;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
};
const baseLayout = (title, body) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e5e5;">
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #e5e5e5;">
              <h1 style="margin:0;font-size:24px;font-weight:normal;letter-spacing:2px;">NEXACORE</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#333;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;background:#fafafa;border-top:1px solid #e5e5e5;font-family:Arial,sans-serif;font-size:12px;color:#888;">
              This is an automated message from NEXACORE. Please do not reply directly to this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
const orderPlacedBuyerEmail = (order) => {
    const noteBlock = order.orderNote
        ? `<p><strong>Order note:</strong> ${order.orderNote}</p>`
        : '';
    const body = `
    <h2 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:normal;">Thank you for your order</h2>
    <p>Hi ${order.customerName},</p>
    <p>We have received your order <strong>${order.orderNumber}</strong>. We will notify you when the status changes.</p>
    <p style="margin:24px 0 8px;"><strong>Order total:</strong> $${order.total.toFixed(2)}</p>
    <p style="margin:0 0 8px;"><strong>Payment:</strong> ${order.paymentMethod}</p>
    <p style="margin:0 0 24px;"><strong>Status:</strong> ${order.status}</p>
    ${formatItemsTable(order)}
    <h3 style="margin:32px 0 12px;font-size:16px;">Shipping address</h3>
    <p style="margin:0;">${formatAddress(order)}</p>
    ${noteBlock}
  `;
    return {
        subject: `Order confirmed — ${order.orderNumber}`,
        html: baseLayout('Order Confirmation', body),
    };
};
exports.orderPlacedBuyerEmail = orderPlacedBuyerEmail;
const orderPlacedAdminEmail = (order) => {
    const noteBlock = order.orderNote
        ? `<p><strong>Order note:</strong> ${order.orderNote}</p>`
        : '';
    const body = `
    <h2 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:normal;">New order received</h2>
    <p><strong>${order.orderNumber}</strong> was placed by ${order.customerName} (${order.email}).</p>
    <p style="margin:16px 0 8px;"><strong>Phone:</strong> ${order.phone}</p>
    <p style="margin:0 0 8px;"><strong>Total:</strong> $${order.total.toFixed(2)}</p>
    <p style="margin:0 0 24px;"><strong>Payment:</strong> ${order.paymentMethod}</p>
    ${formatItemsTable(order)}
    <h3 style="margin:32px 0 12px;font-size:16px;">Shipping address</h3>
    <p style="margin:0;">${formatAddress(order)}</p>
    ${noteBlock}
  `;
    return {
        subject: `[Admin] New order ${order.orderNumber}`,
        html: baseLayout('New Order', body),
    };
};
exports.orderPlacedAdminEmail = orderPlacedAdminEmail;
const orderStatusUpdatedEmail = (order, previousStatus) => {
    const body = `
    <h2 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:normal;">Order status updated</h2>
    <p>Hi ${order.customerName},</p>
    <p>Your order <strong>${order.orderNumber}</strong> has been updated.</p>
    <p style="margin:24px 0;padding:16px;background:#f5f5f5;border-left:3px solid #111;">
      <strong>${previousStatus}</strong> → <strong>${order.status}</strong>
    </p>
    <p style="margin:0 0 8px;"><strong>Order total:</strong> $${order.total.toFixed(2)}</p>
    <p style="margin:0;">If you have questions, contact our support team.</p>
  `;
    return {
        subject: `Order ${order.orderNumber} — now ${order.status}`,
        html: baseLayout('Order Status Update', body),
    };
};
exports.orderStatusUpdatedEmail = orderStatusUpdatedEmail;
