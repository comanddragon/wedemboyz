from rest_framework import serializers

from apps.payments.models import Invoice


class InvoiceSerializer(serializers.ModelSerializer):
    is_settled = serializers.BooleanField(read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id",
            "order",
            "invoice_number",
            "pdf_file",
            "amount_due",
            "amount_paid",
            "is_settled",
            "issued_at",
        ]
        read_only_fields = fields
