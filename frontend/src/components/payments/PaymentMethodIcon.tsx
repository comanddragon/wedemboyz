import Image from "next/image";
import { Banknote, CircleEllipsis, CreditCard, Landmark, Wallet, WalletCards } from "lucide-react";

import { cn } from "@/src/lib/utils";
import type { PaymentGateway } from "@/src/types";

type PaymentMethod =
  | "CASH"
  | "MTN_MOMO"
  | "ORANGE_MONEY"
  | "BANK_TRANSFER"
  | "OTHER"
  | "STRIPE"
  | "PAYPAL"
  | "CREDIT";

export function PaymentMethodIcon({
  method,
  gateway,
  className,
}: {
  method: PaymentMethod;
  gateway?: PaymentGateway;
  className?: string;
}) {
  // Older online payments were stored as OTHER in the manual-ledger field.
  // Their gateway still carries the accurate method and should drive the icon.
  const resolvedMethod = method === "OTHER" && gateway ? gateway : method;
  const frame = cn(
    "flex h-9 w-12 shrink-0 items-center justify-center rounded-lg border border-crease bg-white p-1.5 text-navy",
    className,
  );

  if (resolvedMethod === "MTN_MOMO") {
    return <span className={frame}><Image src="/brands/mtn-momo.png" alt="MTN MoMo" width={44} height={21} className="h-auto max-h-7 w-full object-contain" /></span>;
  }
  if (resolvedMethod === "ORANGE_MONEY") {
    return <span className={frame}><Image src="/brands/orange-money.svg" alt="Orange Money" width={44} height={12} className="h-auto w-full object-contain" /></span>;
  }

  const Icon = resolvedMethod === "CASH"
    ? Banknote
    : resolvedMethod === "BANK_TRANSFER"
      ? Landmark
      : resolvedMethod === "OTHER"
        ? CircleEllipsis
        : resolvedMethod === "CREDIT"
          ? WalletCards
          : resolvedMethod === "PAYPAL"
            ? Wallet
            : CreditCard;
  return <span className={frame} aria-hidden="true"><Icon className="h-4 w-4" /></span>;
}
