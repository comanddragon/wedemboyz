"""Business event snapshots for customer email."""

from services.email import language_for, queue_email


def order_email(order, *, received=False, key=None):
    fr = language_for(order.user) == "fr"
    event = "order_received" if received else f"order_{order.status.lower()}"
    details = [
        ("Commande" if fr else "Order", order.ticket_number or f"WDL-{order.pk:06d}"),
        ("Total", f"{order.total_amount} XAF"),
        ("Retrait" if fr else "Pickup", order.pickup_address or "—"),
        ("Livraison" if fr else "Delivery", order.delivery_address or "—"),
    ]
    items = "\n".join(
        f"{item.quantity} × {item.label or item.get_service_type_display()} — {item.subtotal} XAF"
        for item in order.items.all()
    )
    return queue_email(
        order.user,
        event,
        key=key or f"order/{order.pk}/received",
        details=details,
        body=items,
        path=f"orders/{order.pk}",
    )


def payment_email(payment, *, failed=False):
    user = payment.order.user if payment.order_id else payment.subscription.user
    fr = language_for(user) == "fr"
    target = (
        payment.order.ticket_number
        if payment.order_id
        else f"Subscription #{payment.subscription_id}"
    )
    details = [
        ("Référence" if fr else "Reference", target),
        ("Montant" if fr else "Amount", f"{payment.amount} {payment.currency}"),
        ("Paiement" if fr else "Payment", str(payment.pk)),
        ("Mode" if fr else "Method", payment.get_gateway_display()),
    ]
    if payment.paid_at and not failed:
        details.append(("Date", payment.paid_at.isoformat()))
    event = "payment_failed" if failed else "payment_receipt"
    return queue_email(
        user,
        event,
        key=f"payment/{payment.pk}/{event}",
        details=details,
        path=f"orders/{payment.order_id}" if payment.order_id else "subscription",
        essential=True,
    )


def subscription_email(subscription, event):
    fr = language_for(subscription.user) == "fr"
    details = [
        ("Abonnement" if fr else "Plan", subscription.get_plan_display()),
        ("Début" if fr else "Start", str(subscription.start_date)),
        ("Fin" if fr else "End", str(subscription.end_date)),
        ("Quota restant" if fr else "Remaining allowance", f"{subscription.kg_remaining} kg"),
    ]
    return queue_email(
        subscription.user,
        event,
        key=f"subscription/{subscription.pk}/{event}/{subscription.end_date}",
        details=details,
        path="subscription",
    )


def refund_email(refund):
    payment = refund.payment
    user = payment.order.user if payment.order_id else payment.subscription.user
    fr = language_for(user) == "fr"
    statuses = {
        "PENDING": "En attente",
        "APPROVED": "Approuvé",
        "REJECTED": "Refusé",
        "PROCESSED": "Traité",
    }
    return queue_email(
        user,
        "refund_update",
        key=f"refund/{refund.pk}/{refund.status}",
        details=[
            ("Remboursement" if fr else "Refund", str(refund.pk)),
            ("Montant" if fr else "Amount", f"{refund.amount} {payment.currency}"),
            (
                "Statut" if fr else "Status",
                statuses[refund.status] if fr else refund.get_status_display(),
            ),
        ],
        path=f"orders/{payment.order_id}" if payment.order_id else "subscription",
        essential=True,
    )
