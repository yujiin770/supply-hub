import json
import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class EmailService:
    """
    Sends transactional email via the SendGrid v3 Mail Send API.
    Uses plain HTTP (httpx) so there are no extra SDK dependencies.
    """

    def __init__(self) -> None:
        self.settings = get_settings()

    def send(
        self,
        to_email: str,
        subject: str,
        body: str,
        is_html: bool = True,
    ) -> bool:
        settings = self.settings
        if not settings.sendgrid_api_key or not settings.sendgrid_from_email:
            logger.info(
                "[EMAIL STUB] %s — SendGrid not configured (to=%s)", subject, to_email
            )
            return False
        payload = {
            "personalizations": [
                {
                    "to": [{"email": to_email}],
                }
            ],
            "from": {
                "email": settings.sendgrid_from_email or "",
                "name": settings.sendgrid_from_name or "",
            },
            "subject": subject,
            "content": [
                {
                    "type": "text/html" if is_html else "text/plain",
                    "value": body,
                }
            ],
        }

        try:
            response = httpx.post(
                settings.sendgrid_url,
                content=json.dumps(payload),
                headers={
                    "Authorization": f"Bearer {settings.sendgrid_api_key}",
                    "Content-Type": "application/json",
                },
                timeout=10,
            )
            if not response.is_success:
                logger.error(
                    "SendGrid error status=%s body=%s", response.status_code, response.text
                )
            return response.is_success
        except Exception as exc:
            logger.error("Email sending failed: %s", exc)
            return False

    def send_otp(self, to_email: str, otp: str) -> bool:
        settings = self.settings
        subject = f"Your {settings.project_name} verification code"
        body = f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#2d6a4f">{settings.project_name}</h2>
            <p>Use the code below to complete your sign-in. It expires in
               <strong>{settings.otp_expire_minutes} minutes</strong>.</p>
            <div style="font-size:36px;font-weight:bold;letter-spacing:8px;
                        color:#1b4332;padding:16px;background:#d8f3dc;
                        border-radius:8px;text-align:center">
                {otp}
            </div>
            <p style="color:#888;font-size:12px;margin-top:24px">
                If you did not request this code, please ignore this email.
            </p>
        </div>
        """
        return self.send(to_email, subject, body, is_html=True)

    def send_password_reset(self, to_email: str, reset_url: str) -> bool:
        settings = self.settings
        subject = f"Reset your {settings.project_name} password"
        body = f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#2d6a4f">{settings.project_name}</h2>
            <p>We received a request to reset your password. Click the button below
               to create a new password. This link expires in
               <strong>{settings.password_reset_expire_minutes} minutes</strong>.</p>
            <div style="text-align:center;margin:32px 0">
                <a href="{reset_url}"
                   style="background:#1b4332;color:#ffffff;padding:14px 28px;
                          border-radius:6px;text-decoration:none;font-size:16px;
                          font-weight:bold;display:inline-block">
                    Reset Password
                </a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break:break-all;color:#555;font-size:13px">{reset_url}</p>
            <p style="color:#888;font-size:12px;margin-top:24px">
                If you did not request a password reset, please ignore this email.
                Your password will not change.
            </p>
        </div>
        """
        return self.send(to_email, subject, body, is_html=True)

    def send_admin_invitation(self, to_email: str, full_name: str, activate_url: str) -> bool:
        settings = self.settings
        subject = f"You've been invited to {settings.project_name} as an Admin"
        body = f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#2d6a4f">{settings.project_name}</h2>
            <p>Hi <strong>{full_name}</strong>,</p>
            <p>A Super Admin has created an admin account for you on
               <strong>{settings.project_name}</strong>.
               Click the button below to activate your account and set your password.</p>
            <p>This activation link expires in
               <strong>{settings.password_reset_expire_minutes} minutes</strong>.</p>
            <div style="text-align:center;margin:32px 0">
                <a href="{activate_url}"
                   style="background:#1b4332;color:#ffffff;padding:14px 28px;
                          border-radius:6px;text-decoration:none;font-size:16px;
                          font-weight:bold;display:inline-block">
                    Activate Account &amp; Set Password
                </a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break:break-all;color:#555;font-size:13px">{activate_url}</p>
            <p style="color:#888;font-size:12px;margin-top:24px">
                If you were not expecting this invitation, you can safely ignore this email.
            </p>
        </div>
        """
        return self.send(to_email, subject, body, is_html=True)

    def send_order_edited_notification(
        self,
        to_email: str,
        buyer_name: str,
        order_number: str,
        supplier_name: str,
        items: list,
        total: str,
        supplier_edit_notes: str,
    ) -> bool:
        """
        Notify the buyer (partner) that the supplier has modified their order.
        The order is now AWAITING_CONFIRMATION — the buyer must re-confirm or cancel.
        """
        item_rows = "".join(
            f"""
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">{item.get("brand_name", "—")}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">{item.get("quantity", 0)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">&#8369;{item.get("unit_price") or "—"}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">&#8369;{item.get("subtotal") or "—"}</td>
            </tr>
            """
            for item in items
        )

        subject = f"Your order {order_number} has been updated by {supplier_name}"
        body = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;">
          <h2 style="color:#4f46e5;">Order Updated — Action Required</h2>
          <p>Hi <strong>{buyer_name}</strong>,</p>
          <p>
            <strong>{supplier_name}</strong> has made changes to your order
            <strong>{order_number}</strong>.
            Please log in to review the updated items and confirm or cancel.
          </p>
          <table style="width:100%;border-collapse:collapse;margin-top:24px;font-size:14px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Product</th>
                <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;">Qty</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Unit Price</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {item_rows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3"
                    style="padding:10px 12px;text-align:right;font-weight:bold;border-top:2px solid #e5e7eb;">
                  Total
                </td>
                <td style="padding:10px 12px;text-align:right;font-weight:bold;border-top:2px solid #e5e7eb;">
                  &#8369;{total}
                </td>
              </tr>
            </tfoot>
          </table>
          <div style="margin-top:24px;padding:16px;background:#fef3c7;border-radius:8px;border-left:4px solid #f59e0b;">
            <strong>Supplier's remarks:</strong>
            <p style="margin:8px 0 0;">{supplier_edit_notes}</p>
          </div>
          <p style="margin-top:24px;font-size:13px;color:#6b7280;">
            Please log in to the JuanMeds Partners Portal to confirm or cancel this order.
          </p>
          <p style="font-size:12px;color:#9ca3af;">
            Order Reference: <strong>{order_number}</strong>
          </p>
        </div>
        """
        return self.send(to_email, subject, body, is_html=True)

    def send_buyer_confirmed_edit_notification(
        self,
        to_email: str,
        buyer_name: str,
        order_number: str,
        supplier_name: str,
        items: list,
        total: str,
    ) -> bool:
        """
        Notify the buyer that they have confirmed the supplier's edits.
        Order is now AWAITING_PAYMENT — buyer must attach payment proof.
        """
        item_rows = "".join(
            f"""
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">{item.get("brand_name") or "—"}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">{item.get("quantity", 0)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">&#8369;{item.get("unit_price") or "—"}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">&#8369;{item.get("subtotal") or "—"}</td>
            </tr>
            """
            for item in items
        )
        subject = f"You confirmed order {order_number} — Please proceed with payment"
        body = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;">
          <h2 style="color:#059669;">Order Changes Confirmed &#10003;</h2>
          <p>Hi <strong>{buyer_name}</strong>,</p>
          <p>
            You have confirmed the updated order <strong>{order_number}</strong>
            from <strong>{supplier_name}</strong>. No further action is required
            for the order details.
          </p>
          <table style="width:100%;border-collapse:collapse;margin-top:24px;font-size:14px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Product</th>
                <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;">Qty</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Unit Price</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {item_rows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3"
                    style="padding:10px 12px;text-align:right;font-weight:bold;border-top:2px solid #e5e7eb;">
                  Total
                </td>
                <td style="padding:10px 12px;text-align:right;font-weight:bold;border-top:2px solid #e5e7eb;">
                  &#8369;{total}
                </td>
              </tr>
            </tfoot>
          </table>
          <div style="margin-top:24px;padding:16px;background:#d1fae5;border-radius:8px;border-left:4px solid #059669;">
            <strong>Next step — Payment required:</strong>
            <p style="margin:8px 0 0;">
              Please log in to the JuanMeds Partners Portal, open this order, and
              attach your payment receipt to proceed with fulfillment.
            </p>
          </div>
          <p style="font-size:12px;color:#9ca3af;margin-top:24px;">
            Order Reference: <strong>{order_number}</strong>
          </p>
        </div>
        """
        return self.send(to_email, subject, body, is_html=True)

    def send_buyer_cancelled_order_notification(
        self,
        to_email: str,
        buyer_name: str,
        order_number: str,
        supplier_name: str,
        items: list,
        total: str,
    ) -> bool:
        """
        Confirm to the buyer that they have cancelled their order.
        """
        item_rows = "".join(
            f"""
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">{item.get("brand_name") or "—"}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">{item.get("quantity", 0)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">&#8369;{item.get("unit_price") or "—"}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">&#8369;{item.get("subtotal") or "—"}</td>
            </tr>
            """
            for item in items
        )
        subject = f"Your order {order_number} has been cancelled"
        body = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;">
          <h2 style="color:#dc2626;">Order Cancelled</h2>
          <p>Hi <strong>{buyer_name}</strong>,</p>
          <p>
            Your order <strong>{order_number}</strong> with
            <strong>{supplier_name}</strong> has been cancelled as per your request.
          </p>
          <table style="width:100%;border-collapse:collapse;margin-top:24px;font-size:14px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Product</th>
                <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;">Qty</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Unit Price</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {item_rows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3"
                    style="padding:10px 12px;text-align:right;font-weight:bold;border-top:2px solid #e5e7eb;">
                  Total
                </td>
                <td style="padding:10px 12px;text-align:right;font-weight:bold;border-top:2px solid #e5e7eb;">
                  &#8369;{total}
                </td>
              </tr>
            </tfoot>
          </table>
          <p style="margin-top:24px;font-size:13px;color:#6b7280;">
            If this was a mistake or you have questions, please contact JuanMeds support.
          </p>
          <p style="font-size:12px;color:#9ca3af;">
            Order Reference: <strong>{order_number}</strong>
          </p>
        </div>
        """
        return self.send(to_email, subject, body, is_html=True)

    def send_supplier_order_cancelled_by_buyer_notification(
        self,
        to_email: str,
        supplier_name: str,
        buyer_email: str,
        order_number: str,
        items: list,
        total: str,
    ) -> bool:
        """
        Notify the supplier that the buyer has cancelled the order from AWAITING_CONFIRMATION.
        """
        item_rows = "".join(
            f"""
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">{item.get("brand_name") or "—"}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">{item.get("quantity", 0)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">&#8369;{item.get("unit_price") or "—"}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">&#8369;{item.get("subtotal") or "—"}</td>
            </tr>
            """
            for item in items
        )
        subject = f"Order {order_number} has been cancelled by the buyer"
        body = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;">
          <h2 style="color:#dc2626;">Order Cancelled by Buyer</h2>
          <p>Hi <strong>{supplier_name}</strong>,</p>
          <p>
            The buyer (<strong>{buyer_email}</strong>) has cancelled order
            <strong>{order_number}</strong>. No further action is required on your end.
          </p>
          <table style="width:100%;border-collapse:collapse;margin-top:24px;font-size:14px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Product</th>
                <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;">Qty</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Unit Price</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {item_rows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3"
                    style="padding:10px 12px;text-align:right;font-weight:bold;border-top:2px solid #e5e7eb;">
                  Total
                </td>
                <td style="padding:10px 12px;text-align:right;font-weight:bold;border-top:2px solid #e5e7eb;">
                  &#8369;{total}
                </td>
              </tr>
            </tfoot>
          </table>
          <p style="margin-top:24px;font-size:13px;color:#6b7280;">
            Stock for the cancelled items has been automatically restored.
          </p>
          <p style="font-size:12px;color:#9ca3af;">
            Order Reference: <strong>{order_number}</strong>
          </p>
        </div>
        """
        return self.send(to_email, subject, body, is_html=True)

    def send_order_confirmed_notification(
        self,
        to_email: str,
        buyer_name: str,
        order_number: str,
        supplier_name: str,
        items: list,
        total: str,
    ) -> bool:
        """
        Notify the buyer (partner) that the supplier has confirmed their order.
        The order is now AWAITING_PAYMENT — the buyer must attach payment proof.
        """
        item_rows = "".join(
            f"""
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">{item.get("brand_name") or "—"}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">{item.get("quantity", 0)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">&#8369;{item.get("unit_price") or "—"}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">&#8369;{item.get("subtotal") or "—"}</td>
            </tr>
            """
            for item in items
        )
        subject = f"Your order {order_number} has been confirmed — Please proceed with payment"
        body = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;">
          <h2 style="color:#059669;">Order Confirmed &#10003;</h2>
          <p>Hi <strong>{buyer_name}</strong>,</p>
          <p>
            Great news! <strong>{supplier_name}</strong> has confirmed your order
            <strong>{order_number}</strong>.
          </p>
          <table style="width:100%;border-collapse:collapse;margin-top:24px;font-size:14px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Product</th>
                <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;">Qty</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Unit Price</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {item_rows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3"
                    style="padding:10px 12px;text-align:right;font-weight:bold;border-top:2px solid #e5e7eb;">
                  Total
                </td>
                <td style="padding:10px 12px;text-align:right;font-weight:bold;border-top:2px solid #e5e7eb;">
                  &#8369;{total}
                </td>
              </tr>
            </tfoot>
          </table>
          <div style="margin-top:24px;padding:16px;background:#d1fae5;border-radius:8px;border-left:4px solid #059669;">
            <strong>Next step:</strong>
            <p style="margin:8px 0 0;">
              Please log in to the JuanMeds Partners Portal, open this order, and attach your
              payment receipt to proceed with fulfillment.
            </p>
          </div>
          <p style="margin-top:24px;font-size:13px;color:#6b7280;">
            Once your payment is verified by the supplier, your order will move to fulfillment.
          </p>
          <p style="font-size:12px;color:#9ca3af;">
            Order Reference: <strong>{order_number}</strong>
          </p>
        </div>
        """
        return self.send(to_email, subject, body, is_html=True)

    def send_payment_submitted_notification(
        self,
        to_email: str,
        supplier_name: str,
        buyer_email: str,
        order_number: str,
        items: list,
        total: str,
        payment_reference_no: str = "",
        payment_amount: str = "",
        payment_date: str = "",
    ) -> bool:
        """
        Notify the supplier that the buyer has submitted a payment receipt.
        The supplier must now confirm payment to proceed with fulfillment.
        """
        item_rows = "".join(
            f"""
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">{item.get("brand_name") or "—"}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">{item.get("quantity", 0)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">&#8369;{item.get("unit_price") or "—"}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">&#8369;{item.get("subtotal") or "—"}</td>
            </tr>
            """
            for item in items
        )
        payment_details = ""
        if payment_reference_no:
            payment_details += f"<p style='margin:4px 0;'><strong>Reference No:</strong> {payment_reference_no}</p>"
        if payment_amount:
            payment_details += f"<p style='margin:4px 0;'><strong>Amount Paid:</strong> &#8369;{payment_amount}</p>"
        if payment_date:
            payment_details += f"<p style='margin:4px 0;'><strong>Payment Date:</strong> {payment_date}</p>"
        subject = f"Payment receipt submitted for order {order_number} — Action required"
        body = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;">
          <h2 style="color:#2563eb;">Payment Receipt Received &#128176;</h2>
          <p>Hi <strong>{supplier_name}</strong>,</p>
          <p>
            The buyer (<strong>{buyer_email}</strong>) has submitted a payment receipt
            for order <strong>{order_number}</strong>. Please log in to the JuanMeds
            SupplyHub to review and confirm the payment.
          </p>
          {f'<div style="margin-top:16px;padding:14px;background:#eff6ff;border-radius:8px;border-left:4px solid #2563eb;">{payment_details}</div>' if payment_details else ''}
          <table style="width:100%;border-collapse:collapse;margin-top:24px;font-size:14px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Product</th>
                <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;">Qty</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Unit Price</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {item_rows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3"
                    style="padding:10px 12px;text-align:right;font-weight:bold;border-top:2px solid #e5e7eb;">
                  Total
                </td>
                <td style="padding:10px 12px;text-align:right;font-weight:bold;border-top:2px solid #e5e7eb;">
                  &#8369;{total}
                </td>
              </tr>
            </tfoot>
          </table>
          <div style="margin-top:24px;padding:16px;background:#dbeafe;border-radius:8px;border-left:4px solid #2563eb;">
            <strong>Action required:</strong>
            <p style="margin:8px 0 0;">
              Please review the payment receipt in SupplyHub and confirm or decline it
              to proceed with order fulfillment.
            </p>
          </div>
          <p style="font-size:12px;color:#9ca3af;margin-top:24px;">
            Order Reference: <strong>{order_number}</strong>
          </p>
        </div>
        """
        return self.send(to_email, subject, body, is_html=True)

    def send_order_cancelled_notification(
        self,
        to_email: str,
        buyer_name: str,
        order_number: str,
        supplier_name: str,
        items: list,
        total: str,
        cancel_remarks: str,
    ) -> bool:
        """
        Notify the buyer (partner) that the supplier has cancelled their order.
        """
        item_rows = "".join(
            f"""
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">{item.get("brand_name") or "—"}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">{item.get("quantity", 0)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">&#8369;{item.get("unit_price") or "—"}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">&#8369;{item.get("subtotal") or "—"}</td>
            </tr>
            """
            for item in items
        )
        subject = f"Your order {order_number} has been cancelled"
        body = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;">
          <h2 style="color:#dc2626;">Order Cancelled</h2>
          <p>Hi <strong>{buyer_name}</strong>,</p>
          <p>
            Unfortunately, <strong>{supplier_name}</strong> has cancelled your order
            <strong>{order_number}</strong>.
          </p>
          <table style="width:100%;border-collapse:collapse;margin-top:24px;font-size:14px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Product</th>
                <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;">Qty</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Unit Price</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {item_rows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3"
                    style="padding:10px 12px;text-align:right;font-weight:bold;border-top:2px solid #e5e7eb;">
                  Total
                </td>
                <td style="padding:10px 12px;text-align:right;font-weight:bold;border-top:2px solid #e5e7eb;">
                  &#8369;{total}
                </td>
              </tr>
            </tfoot>
          </table>
          <div style="margin-top:24px;padding:16px;background:#fee2e2;border-radius:8px;border-left:4px solid #dc2626;">
            <strong>Cancellation reason:</strong>
            <p style="margin:8px 0 0;">{cancel_remarks}</p>
          </div>
          <p style="margin-top:24px;font-size:13px;color:#6b7280;">
            If you have questions, please contact the supplier or reach out to JuanMeds support.
          </p>
          <p style="font-size:12px;color:#9ca3af;">
            Order Reference: <strong>{order_number}</strong>
          </p>
        </div>
        """
        return self.send(to_email, subject, body, is_html=True)

    def send_payment_confirmed_notification(
        self,
        to_email: str,
        buyer_name: str,
        order_number: str,
        supplier_name: str,
        items: list,
        total: str,
    ) -> bool:
        """
        Notify the buyer that the supplier has confirmed their payment receipt.
        Order moves to CONFIRMED status and will be prepared for shipment.
        """
        em = "&#8212;"
        item_rows = "".join(
            f"""
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">{item.get("brand_name") or em}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">{item.get("quantity", 0)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">&#8369;{item.get("unit_price") or em}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">&#8369;{item.get("subtotal") or em}</td>
            </tr>
            """
            for item in items
        )
        subject = f"Your payment for order {order_number} has been confirmed ✓"
        body = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;">
          <h2 style="color:#059669;">Payment Confirmed &#10003;</h2>
          <p>Hi <strong>{buyer_name}</strong>,</p>
          <p>
            Great news! <strong>{supplier_name}</strong> has confirmed your payment for
            order <strong>{order_number}</strong>. Your order is now confirmed and will
            be prepared for shipment.
          </p>
          <table style="width:100%;border-collapse:collapse;margin-top:24px;font-size:14px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Product</th>
                <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;">Qty</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Unit Price</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {item_rows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3"
                    style="padding:10px 12px;text-align:right;font-weight:bold;border-top:2px solid #e5e7eb;">
                  Total
                </td>
                <td style="padding:10px 12px;text-align:right;font-weight:bold;border-top:2px solid #e5e7eb;">
                  &#8369;{total}
                </td>
              </tr>
            </tfoot>
          </table>
          <div style="margin-top:24px;padding:16px;background:#d1fae5;border-radius:8px;border-left:4px solid #059669;">
            <strong>What happens next?</strong>
            <p style="margin:8px 0 0;">
              The supplier will now prepare your order for shipment. You will be notified
              once your order has been dispatched.
            </p>
          </div>
          <p style="font-size:12px;color:#9ca3af;margin-top:24px;">
            Order Reference: <strong>{order_number}</strong>
          </p>
        </div>
        """
        return self.send(to_email, subject, body, is_html=True)

    def send_payment_declined_notification(
        self,
        to_email: str,
        buyer_name: str,
        order_number: str,
        supplier_name: str,
        items: list,
        total: str,
        decline_remarks: str,
    ) -> bool:
        """
        Notify the buyer that the supplier has declined their payment receipt.
        Instructs the buyer to re-upload a valid receipt with correct details.
        """
        em = "&#8212;"
        item_rows = "".join(
            f"""
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">{item.get("brand_name") or em}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">{item.get("quantity", 0)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">&#8369;{item.get("unit_price") or em}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">&#8369;{item.get("subtotal") or em}</td>
            </tr>
            """
            for item in items
        )
        subject = f"Action required: Payment receipt declined for order {order_number}"
        body = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;">
          <h2 style="color:#d97706;">Payment Receipt Declined</h2>
          <p>Hi <strong>{buyer_name}</strong>,</p>
          <p>
            Unfortunately, <strong>{supplier_name}</strong> has declined your payment
            receipt for order <strong>{order_number}</strong>.
          </p>
          <div style="margin-top:16px;padding:16px;background:#fef3c7;border-radius:8px;border-left:4px solid #d97706;">
            <strong>Reason from supplier:</strong>
            <p style="margin:8px 0 0;">{decline_remarks}</p>
          </div>
          <table style="width:100%;border-collapse:collapse;margin-top:24px;font-size:14px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Product</th>
                <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;">Qty</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Unit Price</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {item_rows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3"
                    style="padding:10px 12px;text-align:right;font-weight:bold;border-top:2px solid #e5e7eb;">
                  Total
                </td>
                <td style="padding:10px 12px;text-align:right;font-weight:bold;border-top:2px solid #e5e7eb;">
                  &#8369;{total}
                </td>
              </tr>
            </tfoot>
          </table>
          <div style="margin-top:24px;padding:16px;background:#ffedd5;border-radius:8px;border-left:4px solid #ea580c;">
            <strong>Action required:</strong>
            <p style="margin:8px 0 0;">
              Please log in to JuanMeds and re-upload a valid payment receipt for this
              order. Make sure the reference number, payment amount, and payment date
              are all clearly visible and accurate.
            </p>
          </div>
          <p style="font-size:12px;color:#9ca3af;margin-top:24px;">
            Order Reference: <strong>{order_number}</strong>
          </p>
        </div>
        """
        return self.send(to_email, subject, body, is_html=True)

    def send_order_shipped_notification(
        self,
        to_email: str,
        buyer_name: str,
        order_number: str,
        supplier_name: str,
        items: list,
        total: str,
        ship_remarks: str = "",
    ) -> bool:
        """
        Notify the buyer that the supplier has shipped their order.
        """
        em = "&#8212;"
        item_rows = "".join(
            f"""
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">{item.get("brand_name") or em}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">{item.get("quantity", 0)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">&#8369;{item.get("unit_price") or em}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">&#8369;{item.get("subtotal") or em}</td>
            </tr>
            """
            for item in items
        )
        remarks_section = ship_remarks.strip()
        remarks_block = (
            f'<div style="margin-top:16px;padding:14px;background:#eff6ff;border-radius:8px;border-left:4px solid #2563eb;">'
            f'<strong>Note from supplier:</strong><p style="margin:8px 0 0;">{remarks_section}</p></div>'
            if remarks_section else ""
        )
        subject = f"Your order {order_number} has been shipped!"
        body = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;">
          <h2 style="color:#2563eb;">Order Shipped &#128666;</h2>
          <p>Hi <strong>{buyer_name}</strong>,</p>
          <p>
            Great news! <strong>{supplier_name}</strong> has shipped your order
            <strong>{order_number}</strong>. It is now on its way to you.
          </p>
          {remarks_block}
          <table style="width:100%;border-collapse:collapse;margin-top:24px;font-size:14px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Product</th>
                <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;">Qty</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Unit Price</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {item_rows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3"
                    style="padding:10px 12px;text-align:right;font-weight:bold;border-top:2px solid #e5e7eb;">
                  Total
                </td>
                <td style="padding:10px 12px;text-align:right;font-weight:bold;border-top:2px solid #e5e7eb;">
                  &#8369;{total}
                </td>
              </tr>
            </tfoot>
          </table>
          <p style="font-size:12px;color:#9ca3af;margin-top:24px;">
            Order Reference: <strong>{order_number}</strong>
          </p>
        </div>
        """
        return self.send(to_email, subject, body, is_html=True)

    def send_order_delivered_notification(
        self,
        to_email: str,
        buyer_name: str,
        order_number: str,
        supplier_name: str,
        items: list,
        total: str,
        delivery_remarks: str = "",
    ) -> bool:
        """
        Notify the buyer that their order has been marked as delivered.
        """
        em = "&#8212;"
        item_rows = "".join(
            f"""
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">{item.get("brand_name") or em}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">{item.get("quantity", 0)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">&#8369;{item.get("unit_price") or em}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">&#8369;{item.get("subtotal") or em}</td>
            </tr>
            """
            for item in items
        )
        remarks_section = delivery_remarks.strip()
        remarks_block = (
            f'<div style="margin-top:16px;padding:14px;background:#f0fdf4;border-radius:8px;border-left:4px solid #16a34a;">'
            f'<strong>Note from supplier:</strong><p style="margin:8px 0 0;">{remarks_section}</p></div>'
            if remarks_section else ""
        )
        subject = f"Your order {order_number} has been delivered!"
        body = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;">
          <h2 style="color:#16a34a;">Order Delivered &#10003;</h2>
          <p>Hi <strong>{buyer_name}</strong>,</p>
          <p>
            Your order <strong>{order_number}</strong> from <strong>{supplier_name}</strong>
            has been marked as delivered. We hope everything arrived in perfect condition!
          </p>
          {remarks_block}
          <table style="width:100%;border-collapse:collapse;margin-top:24px;font-size:14px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Product</th>
                <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;">Qty</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Unit Price</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {item_rows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3"
                    style="padding:10px 12px;text-align:right;font-weight:bold;border-top:2px solid #e5e7eb;">
                  Total
                </td>
                <td style="padding:10px 12px;text-align:right;font-weight:bold;border-top:2px solid #e5e7eb;">
                  &#8369;{total}
                </td>
              </tr>
            </tfoot>
          </table>
          <div style="margin-top:24px;padding:16px;background:#d1fae5;border-radius:8px;border-left:4px solid #16a34a;">
            <p style="margin:0;">Thank you for your order! If you have any concerns about the delivery, please contact the supplier or JuanMeds support.</p>
          </div>
          <p style="font-size:12px;color:#9ca3af;margin-top:24px;">
            Order Reference: <strong>{order_number}</strong>
          </p>
        </div>
        """
        return self.send(to_email, subject, body, is_html=True)
