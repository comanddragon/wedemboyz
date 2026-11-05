"""Business-event observers shared by API, admin, and background operations.

Only customer-visible fields are observed. Internal notes, staff assignments,
login timestamps and unchanged saves never generate inbox messages.
"""

from uuid import uuid4

from django.conf import settings
from django.db.models.signals import post_save, pre_save

from apps.discounts.models import (
    AmbassadorCashout,
    AmbassadorProfile,
    BadgeAccount,
    DiscountCampaign,
    LoyaltyRewardGrant,
    LoyaltyTransaction,
    PromoCode,
)
from apps.finance.models import CreditAccount, CreditTransaction
from apps.orders.models import Order, PickupDeliverySchedule
from apps.payments.models import Payment, Refund, Subscription
from apps.users.models import CustomUser, LoyaltyAccount, UserProfile
from services.notifications import notify

WATCHED = {
    Order: (
        "status",
        "total_amount",
        "pickup_address",
        "delivery_address",
        "expected_ready_at",
        "payment_due_date",
        "payment_waived_reason",
    ),
    PickupDeliverySchedule: (
        "pickup_date",
        "pickup_time_slot",
        "delivery_date",
        "delivery_time_slot",
        "pickup_status",
        "delivery_status",
        "address_override",
    ),
    Payment: ("status", "voided_at"),
    Refund: ("status",),
    Subscription: ("status", "end_date", "cancel_at_period_end", "plan"),
    CustomUser: ("first_name", "last_name", "phone_number", "email", "is_active", "password"),
    UserProfile: (
        "is_blocked",
        "address_line",
        "city",
        "default_pickup_address",
        "secondary_phone",
        "whatsapp_number",
        "marketing_opt_in",
        "gender",
        "avatar",
        "use_profile_photo",
        "date_of_birth",
        "water_temperature",
        "spin_speed",
        "detergent_preference",
        "folding_style",
    ),
    AmbassadorProfile: ("is_active", "credit_balance", "promo_code_id"),
    AmbassadorCashout: ("paid_at",),
    PromoCode: ("code",),
    BadgeAccount: ("badges", "tier", "completed_cards"),
    LoyaltyAccount: ("tier",),
    LoyaltyRewardGrant: ("is_redeemed",),
    CreditAccount: ("credit_limit",),
    DiscountCampaign: (
        "is_active",
        "start_date",
        "end_date",
        "target_segment",
        "value",
        "discount_type",
        "name",
        "description",
    ),
    LoyaltyTransaction: (),
    CreditTransaction: (),
}


FRENCH_STATUS = {
    "PENDING": "En attente",
    "SUCCEEDED": "Confirmé",
    "FAILED": "Échoué",
    "REFUNDED": "Remboursé",
    "PARTIALLY_REFUNDED": "Partiellement remboursé",
    "APPROVED": "Approuvé",
    "REJECTED": "Refusé",
    "PROCESSED": "Traité",
    "ACTIVE": "Actif",
    "CANCELLED": "Annulé",
    "EXPIRED": "Expiré",
    "SCHEDULED": "Planifié",
    "RESCHEDULED": "Replanifié",
    "COMPLETED": "Terminé",
    "MISSED": "Manqué",
}


def snapshot(sender, instance, raw=False, **kwargs):
    if raw or getattr(settings, "SEED_DATA_ACTIVE", False):
        return
    fields = WATCHED[sender]
    instance._inbox_previous = (
        sender.objects.filter(pk=instance.pk).values(*fields).first()
        if instance.pk and fields
        else None
    )


def comparable(field, value):
    # FileField values are names in query snapshots but FieldFile objects on
    # model instances. Normalize empty files so an internal-note save is quiet.
    if field == "avatar":
        return getattr(value, "name", value) or ""
    return value


def customer_event(sender, instance, created, raw=False, update_fields=None, **kwargs):
    if raw or getattr(settings, "SEED_DATA_ACTIVE", False):
        return
    previous = getattr(instance, "_inbox_previous", None) or {}
    changed = {
        field
        for field in WATCHED[sender]
        if field in previous
        and comparable(field, previous[field]) != comparable(field, getattr(instance, field))
        and (update_fields is None or field in update_fields)
    }
    if not created and not changed:
        return
    key = f"{instance._meta.label_lower}/{instance.pk}/{uuid4().hex}"
    if created:
        key = f"{instance._meta.label_lower}/{instance.pk}/created"

    def emit(user, title, body, **options):
        return notify(user, key=key, title=title, body=body, **options)

    if sender is Order:
        order = instance
        ticket = order.ticket_number or f"WDL-{order.pk:06d}"
        options = dict(kind="ORDER_UPDATE", path=f"orders/{order.pk}", order=order)
        if created:
            emit(
                order.user,
                ("Order received", "Commande reçue"),
                (f"Your order {ticket} has been created.", f"Votre commande {ticket} a été créée."),
                email=False,
                **options,
            )
        elif "status" in changed:
            statuses = {
                "PENDING": ("Pending", "En attente"),
                "CONFIRMED": ("Confirmed", "Confirmée"),
                "COLLECTED": ("Collected", "Collectée"),
                "IN_PROGRESS": ("In progress", "En cours"),
                "READY": ("Ready", "Prête"),
                "OUT_FOR_DELIVERY": ("Out for delivery", "En livraison"),
                "DELIVERED": ("Delivered", "Livrée"),
                "CANCELLED": ("Cancelled", "Annulée"),
            }
            en, fr = statuses.get(order.status, (order.status, order.status))
            emit(
                order.user,
                (f"Order {ticket}: {en}", f"Commande {ticket} : {fr}"),
                (
                    f"Your order status is now {en.lower()}.",
                    f"Statut de votre commande : {fr.lower()}.",
                ),
                email=False,
                **options,
            )
        else:
            emit(
                order.user,
                ("Order details updated", "Commande modifiée"),
                (
                    f"Details for {ticket} have changed. Current total: {order.total_amount} "
                    f"FCFA. Review your order for the latest addresses and dates.",
                    f"Les informations de {ticket} ont changé. Total actuel : {order.total_amount} "
                    f"FCFA. Consultez les adresses et dates de votre commande.",
                ),
                **options,
            )
    elif sender is PickupDeliverySchedule:
        order = instance.order
        emit(
            order.user,
            ("Pickup and delivery schedule updated", "Collecte et livraison mises à jour"),
            (
                f"Pickup: {instance.pickup_date}, {instance.get_pickup_time_slot_display()} "
                f"({instance.get_pickup_status_display()}). Delivery: {instance.delivery_date}, "
                f"{instance.get_delivery_time_slot_display()} "
                f"({instance.get_delivery_status_display()}).",
                f"Collecte : {instance.pickup_date}, {instance.get_pickup_time_slot_display()} "
                f"({FRENCH_STATUS.get(instance.pickup_status, instance.pickup_status)}). "
                f"Livraison : {instance.delivery_date}, "
                f"{instance.get_delivery_time_slot_display()} "
                f"({FRENCH_STATUS.get(instance.delivery_status, instance.delivery_status)}).",
            ),
            kind="ORDER_UPDATE",
            order=order,
            path=f"orders/{order.pk}",
            email=False,
        )
    elif sender in (Payment, Refund):
        payment = instance if sender is Payment else instance.payment
        user = (
            payment.order.user
            if payment.order_id
            else payment.subscription.user
            if payment.subscription_id
            else None
        )
        if user is None:
            return
        if (
            sender is Payment
            and instance.status not in {"SUCCEEDED", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"}
            and not instance.voided_at
        ):
            return
        if sender is Refund:
            title = ("Refund updated", "Remboursement mis à jour")
        elif instance.voided_at:
            title = ("Payment voided", "Paiement annulé")
        else:
            title = ("Payment updated", "Paiement mis à jour")
        voided = sender is Payment and bool(instance.voided_at)
        en_status = "Voided" if voided else instance.get_status_display()
        fr_status = "Annulé" if voided else FRENCH_STATUS.get(instance.status, instance.status)
        emit(
            user,
            title,
            (
                f"{instance.amount} {payment.currency} · {en_status}.",
                f"{instance.amount} {payment.currency} · {fr_status}.",
            ),
            kind="PAYMENT",
            order=payment.order,
            path=f"orders/{payment.order_id}" if payment.order_id else "subscription",
            email=sender is Payment and (voided or instance.status not in {"SUCCEEDED", "FAILED"}),
        )
    elif sender is Subscription:
        emit(
            instance.user,
            ("Subscription updated", "Abonnement mis à jour"),
            (
                f"{instance.get_plan_display()} · {instance.get_status_display()}. "
                f"Ends {instance.end_date}."
                + (
                    " Cancellation is scheduled at the end of this period."
                    if instance.cancel_at_period_end
                    else ""
                ),
                f"{instance.get_plan_display()} · "
                f"{FRENCH_STATUS.get(instance.status, instance.status)}. Fin : {instance.end_date}."
                + (
                    " Résiliation prévue en fin de période."
                    if instance.cancel_at_period_end
                    else ""
                ),
            ),
            path="subscription",
            email=not (created or changed & {"status", "end_date", "cancel_at_period_end"}),
        )
    elif sender in (CustomUser, UserProfile):
        user = instance if sender is CustomUser else instance.user
        if created:
            if sender is CustomUser and not user.is_staff and not user.is_guest:
                emit(
                    user,
                    ("Welcome to Wedemboyz", "Bienvenue chez Wedemboyz"),
                    (
                        "Your account is ready. Book a pickup and track your laundry here.",
                        "Votre compte est prêt. Réservez une collecte et suivez votre linge ici.",
                    ),
                    path="dashboard",
                    email=False,
                    sms=False,
                )
            return
        # Do not reveal private staff notes, tags, passwords, or blocking reasons.
        if changed & {"is_active", "is_blocked"}:
            restricted = not user.is_active or (sender is UserProfile and instance.is_blocked)
            emit(
                user,
                ("Account access updated", "Accès au compte modifié"),
                (
                    (
                        "Your account access has been restricted. Contact support for help."
                        if restricted
                        else "Your account access has been restored."
                    ),
                    (
                        "L’accès à votre compte a été restreint. Contactez l’assistance."
                        if restricted
                        else "L’accès à votre compte a été rétabli."
                    ),
                ),
                path="settings",
            )
        else:
            emit(
                user,
                ("Account details updated", "Informations du compte modifiées"),
                (
                    "Your contact, profile, or security details have changed. "
                    "Review your settings; contact support if you did not request "
                    "this.",
                    "Vos coordonnées, votre profil ou vos paramètres de sécurité "
                    "ont changé. Consultez vos paramètres et contactez l’assistance "
                    "si vous n’êtes pas à l’origine de cette modification.",
                ),
                path="settings",
            )
    elif sender is AmbassadorProfile:
        title = (
            ("Ambassador account activated", "Compte ambassadeur activé")
            if created
            else ("Ambassador account updated", "Compte ambassadeur modifié")
        )
        emit(
            instance.user,
            title,
            (
                f"Available credits: {instance.credit_balance} FCFA. Promo "
                f"code: {instance.promo_code.code}. "
                f"Account: {'active' if instance.is_active else 'paused'}.",
                f"Crédits disponibles : {instance.credit_balance} FCFA. Code "
                f"promo : {instance.promo_code.code}. "
                f"Compte : {'actif' if instance.is_active else 'en pause'}.",
            ),
            path="loyalty",
        )
    elif sender is PromoCode:
        profile = (
            AmbassadorProfile.objects.filter(promo_code=instance).select_related("user").first()
        )
        if profile and not created:
            emit(
                profile.user,
                ("Ambassador promo code changed", "Code promo ambassadeur modifié"),
                (
                    f"Your promo code is now {instance.code}.",
                    f"Votre code promo est désormais {instance.code}.",
                ),
                path="ambassadors",
            )
    elif sender is AmbassadorCashout:
        paid = bool(instance.paid_at)
        emit(
            instance.ambassador.user,
            (
                ("Cashout paid" if paid else "Cashout requested"),
                ("Retrait payé" if paid else "Retrait demandé"),
            ),
            (
                f"{instance.amount} FCFA "
                + (
                    f"has been paid. Reference: {instance.reference}."
                    if paid
                    else "has been reserved for your cashout."
                ),
                f"{instance.amount} FCFA "
                + (
                    f"ont été payés. Référence : {instance.reference}."
                    if paid
                    else "ont été réservés pour votre retrait."
                ),
            ),
            path="loyalty",
            kind="PAYMENT",
        )
    elif sender is LoyaltyTransaction:
        emit(
            instance.loyalty_account.user,
            ("Loyalty credits updated", "Crédits fidélité mis à jour"),
            (
                f"{instance.points:+d} credits · {instance.get_transaction_type_display()}.",
                f"{instance.points:+d} crédits · {instance.transaction_type}.",
            ),
            path="loyalty",
        )
    elif sender is CreditTransaction:
        emit(
            instance.credit_account.user,
            ("Credit account updated", "Compte de crédit mis à jour"),
            (
                f"{instance.get_transaction_type_display()}: {instance.amount} FCFA.",
                f"Mouvement de crédit ({instance.transaction_type}) : {instance.amount} FCFA.",
            ),
            kind="PAYMENT",
            path="dashboard",
            order=instance.order,
        )
    elif sender is CreditAccount:
        if not created and "credit_limit" in changed:
            emit(
                instance.user,
                ("Credit limit updated", "Plafond de crédit modifié"),
                (
                    f"Your credit limit is now {instance.credit_limit} FCFA (0 means no limit).",
                    f"Votre plafond est désormais de {instance.credit_limit} FCFA "
                    f"(0 signifie sans plafond).",
                ),
                path="dashboard",
            )
    elif sender is LoyaltyRewardGrant:
        emit(
            instance.user,
            (
                ("Reward redeemed" if instance.is_redeemed else "New loyalty reward"),
                ("Récompense utilisée" if instance.is_redeemed else "Nouvelle récompense fidélité"),
            ),
            (instance.reward.name, instance.reward.name),
            path="loyalty",
        )
    elif sender in (BadgeAccount, LoyaltyAccount):
        if created or not changed:
            return
        if sender is BadgeAccount:
            body = (
                f"{instance.badges} badges on your current card. Tier: {instance.tier}.",
                f"{instance.badges} badges sur votre carte actuelle. Niveau : {instance.tier}.",
            )
        else:
            body = (
                f"Your loyalty tier is now {instance.tier}.",
                f"Votre niveau de fidélité est désormais {instance.tier}.",
            )
        emit(
            instance.user,
            ("Loyalty progress updated", "Progression fidélité mise à jour"),
            body,
            path="loyalty",
        )
    elif sender is DiscountCampaign and instance.is_active:
        from django.utils import timezone

        from core.jobs import enqueue

        from .tasks import announce_campaign

        if instance.end_date >= timezone.now():
            # A saved draft/future offer is announced when it becomes available.
            enqueue(
                announce_campaign.name,
                args=[instance.pk],
                run_at=max(timezone.now(), instance.start_date),
                idempotency_key=f"campaign-announcement/{instance.pk}/{uuid4().hex}",
            )


for model in WATCHED:
    pre_save.connect(
        snapshot, sender=model, dispatch_uid=f"inbox-snapshot-{model._meta.label_lower}"
    )
    post_save.connect(
        customer_event, sender=model, dispatch_uid=f"inbox-event-{model._meta.label_lower}"
    )
