"""Purpose-specific English and French email copy; user text is always escaped."""

LABELS = {
    "en": {
        "greeting": "Hello",
        "action_label": "Open my account",
        "help_text": "Need a hand? Reply to this email or contact",
        "footer_text": "Sent in connection with your Wedemboyz account or service.",
        "preferences_label": "Email preferences",
    },
    "fr": {
        "greeting": "Bonjour",
        "action_label": "Accéder à mon compte",
        "help_text": "Besoin d’aide ? Répondez à cet e-mail ou contactez",
        "footer_text": "Envoyé dans le cadre de votre compte ou service Wedemboyz.",
        "preferences_label": "Préférences e-mail",
    },
}

COPY = {
    "invoice_issued": {
        "en": (
            "Your Wedemboyz invoice",
            "Here is your itemized invoice. Review your charges, payments "
            "and remaining balance below.",
        ),
        "fr": (
            "Votre facture Wedemboyz",
            "Voici votre facture détaillée. Consultez vos frais, paiements "
            "et solde restant ci-dessous.",
        ),
    },
    "welcome": {
        "en": (
            "Welcome to Wedemboyz",
            "Your account is ready. Book a collection, choose your laundry care, "
            "and follow every step from your account.",
        ),
        "fr": (
            "Bienvenue chez Wedemboyz",
            "Votre compte est prêt. Réservez une collecte, choisissez vos soins "
            "du linge et suivez chaque étape depuis votre compte.",
        ),
    },
    "order_received": {
        "en": (
            "We’ve received your order",
            "Thank you for trusting us with your laundry. Your order has been "
            "received; we’ll let you know when it is confirmed.",
        ),
        "fr": (
            "Nous avons reçu votre commande",
            "Merci de nous confier votre linge. Votre commande a bien été reçue ;"
            " nous vous informerons dès sa confirmation.",
        ),
    },
    "order_confirmed": {
        "en": (
            "Your order is confirmed",
            "Your laundry order is confirmed. Open your order to review "
            "collection and service details.",
        ),
        "fr": (
            "Votre commande est confirmée",
            "Votre commande de blanchisserie est confirmée. Consultez les détails"
            " de collecte et de service dans votre compte.",
        ),
    },
    "order_in_progress": {
        "en": (
            "Your laundry is in our care",
            "Our team has started processing your laundry. We’ll send another "
            "update when everything is ready.",
        ),
        "fr": (
            "Nous prenons soin de votre linge",
            "Notre équipe a commencé le traitement de votre linge. Nous vous "
            "informerons dès qu’il sera prêt.",
        ),
    },
    "order_ready": {
        "en": (
            "Your laundry is ready",
            "Fresh, finished, and ready for the next step. Check your order for "
            "collection or delivery details.",
        ),
        "fr": (
            "Votre linge est prêt",
            "Votre linge est propre et prêt. Consultez votre commande pour les "
            "détails du retrait ou de la livraison.",
        ),
    },
    "order_out_for_delivery": {
        "en": (
            "Your laundry is on its way",
            "Your order is out for delivery. Please keep your phone nearby so our"
            " team can reach you.",
        ),
        "fr": (
            "Votre linge est en route",
            "Votre commande est en cours de livraison. Gardez votre téléphone à "
            "portée de main pour que notre équipe puisse vous joindre.",
        ),
    },
    "order_delivered": {
        "en": (
            "Your order has been delivered",
            "Thank you for choosing Wedemboyz. We hope you enjoy your freshly "
            "cared-for laundry. Contact us if anything needs attention.",
        ),
        "fr": (
            "Votre commande a été livrée",
            "Merci d’avoir choisi Wedemboyz. Profitez de votre linge fraîchement "
            "entretenu. Contactez-nous si quelque chose nécessite notre "
            "attention.",
        ),
    },
    "order_cancelled": {
        "en": (
            "Your order has been cancelled",
            "This order is now cancelled. If you have already paid, contact our "
            "team to review the applicable refund arrangements.",
        ),
        "fr": (
            "Votre commande a été annulée",
            "Cette commande est désormais annulée. Si vous avez déjà payé, "
            "contactez notre équipe pour examiner les modalités de remboursement "
            "applicables.",
        ),
    },
    "owner_order": {
        "en": (
            "New laundry order",
            "A customer has placed an order. Review the items, contact details, "
            "and fulfilment instructions below.",
        ),
        "fr": (
            "Nouvelle commande de blanchisserie",
            "Un client a passé commande. Consultez les articles, les coordonnées "
            "et les instructions ci-dessous.",
        ),
    },
    "payment_receipt": {
        "en": (
            "Payment received — thank you",
            "We’ve recorded your payment. Keep this receipt for your records. Any"
            " remaining balance is shown in your account.",
        ),
        "fr": (
            "Paiement reçu — merci",
            "Votre paiement a été enregistré. Conservez ce reçu. Le solde "
            "éventuel est indiqué dans votre compte.",
        ),
    },
    "payment_failed": {
        "en": (
            "Your payment was unsuccessful",
            "We could not complete this payment. Check its status in your account"
            " before trying again, or contact our team for help.",
        ),
        "fr": (
            "Votre paiement n’a pas abouti",
            "Ce paiement n’a pas pu être effectué. Vérifiez son statut dans votre"
            " compte avant de réessayer ou contactez notre équipe.",
        ),
    },
    "refund_update": {
        "en": (
            "An update on your refund",
            "The status of your refund request has changed. An approval is not "
            "confirmation that funds have been returned; a processed refund "
            "confirms our team has recorded the transfer.",
        ),
        "fr": (
            "Du nouveau sur votre remboursement",
            "Le statut de votre demande de remboursement a changé. Une "
            "approbation ne confirme pas le retour des fonds ; un remboursement "
            "traité confirme que notre équipe a enregistré le transfert.",
        ),
    },
    "subscription_active": {
        "en": (
            "Your laundry plan is active",
            "Your subscription is ready to use. View your allowance and plan "
            "period in your account.",
        ),
        "fr": (
            "Votre abonnement est actif",
            "Votre abonnement est prêt à être utilisé. Consultez votre quota et "
            "votre période d’abonnement dans votre compte.",
        ),
    },
    "subscription_renewed": {
        "en": (
            "Your laundry plan has renewed",
            "Your new subscription period has started and your allowance has been refreshed.",
        ),
        "fr": (
            "Votre abonnement a été renouvelé",
            "Votre nouvelle période d’abonnement a commencé et votre quota a été réinitialisé.",
        ),
    },
    "subscription_cancelling": {
        "en": (
            "Automatic renewal is turned off",
            "Your plan will not renew automatically. You can use your remaining "
            "benefits until the end of the current plan period.",
        ),
        "fr": (
            "Le renouvellement automatique est désactivé",
            "Votre abonnement ne sera pas renouvelé automatiquement. Vos "
            "avantages restants sont utilisables jusqu’à la fin de la période en "
            "cours.",
        ),
    },
    "subscription_cancelled": {
        "en": (
            "Your laundry plan is cancelled",
            "Your subscription has been cancelled. You can still book laundry "
            "services individually or choose another plan.",
        ),
        "fr": (
            "Votre abonnement est annulé",
            "Votre abonnement a été annulé. Vous pouvez toujours réserver des "
            "services à l’unité ou choisir un autre abonnement.",
        ),
    },
    "subscription_expired": {
        "en": (
            "Your laundry plan has ended",
            "Your subscription period has ended. Visit your account to choose a "
            "new plan or book your next collection.",
        ),
        "fr": (
            "Votre abonnement est arrivé à échéance",
            "Votre période d’abonnement est terminée. Consultez votre compte pour"
            " choisir un nouvel abonnement ou réserver une collecte.",
        ),
    },
    "chat_message": {
        "en": (
            "You have a new message",
            "There’s a new message in your Wedemboyz conversation. Sign in to "
            "read it and reply securely.",
        ),
        "fr": (
            "Vous avez un nouveau message",
            "Un nouveau message vous attend dans votre conversation Wedemboyz. "
            "Connectez-vous pour le lire et répondre.",
        ),
    },
    "promotion": {
        "en": (
            "Something fresh from Wedemboyz",
            "Here’s the latest offer from your laundry team. Check the offer "
            "details and any applicable conditions below.",
        ),
        "fr": (
            "Du nouveau chez Wedemboyz",
            "Découvrez la dernière offre de votre équipe de blanchisserie. "
            "Consultez ses détails et les conditions applicables ci-dessous.",
        ),
    },
    "notification": {
        "en": (
            "An update from Wedemboyz",
            "There’s an update for your account. Review the details below or open your account.",
        ),
        "fr": (
            "Une information de Wedemboyz",
            "Une nouvelle information concerne votre compte. Consultez les "
            "détails ci-dessous ou accédez à votre compte.",
        ),
    },
}

COPY.update(
    {
        "password_reset": {
            "en": (
                "Reset your Wedemboyz password",
                "Use the button below to choose a new password. This link expires"
                " in one hour and can only be used once. If you did not request "
                "it, you can ignore this email.",
            ),
            "fr": (
                "Réinitialisez votre mot de passe Wedemboyz",
                "Utilisez le bouton ci-dessous pour choisir un nouveau mot de "
                "passe. Ce lien expire dans une heure et ne peut être utilisé "
                "qu’une fois. Si vous n’êtes pas à l’origine de cette demande, "
                "ignorez cet e-mail.",
            ),
        },
        "password_changed": {
            "en": (
                "Your password has changed",
                "Your Wedemboyz password was changed. If you did not make this "
                "change, contact our team immediately using the address below.",
            ),
            "fr": (
                "Votre mot de passe a été modifié",
                "Votre mot de passe Wedemboyz a été modifié. Si vous n’êtes pas à"
                " l’origine de ce changement, contactez immédiatement notre "
                "équipe à l’adresse ci-dessous.",
            ),
        },
    }
)

COPY["order_scheduled"] = {
    "en": (
        "Your collection and delivery schedule",
        "Your order schedule has been saved. Review the dates and time windows "
        "below. Contact our team if you need to change the arrangements.",
    ),
    "fr": (
        "Votre planning de collecte et de livraison",
        "Le planning de votre commande a été enregistré. Consultez les dates et "
        "les créneaux ci-dessous. Contactez notre équipe pour modifier les "
        "dispositions.",
    ),
}
