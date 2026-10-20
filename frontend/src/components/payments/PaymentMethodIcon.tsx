import Image from "next/image";
import { Banknote, CircleEllipsis, CreditCard, Landmark, WalletCards } from "lucide-react";

import { cn } from "@/src/lib/utils";

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
  className,
}: {
  method: PaymentMethod;
  className?: string;
}) {
  const frame = cn(
    "flex h-9 w-12 shrink-0 items-center justify-center rounded-lg border border-crease bg-white p-1.5 text-navy",
    className,
  );

  if (method === "MTN_MOMO") {
    return <span className={frame}><Image src="/brands/mtn-momo.png" alt="MTN MoMo" width={44} height={21} className="h-auto max-h-7 w-full object-contain" /></span>;
  }
  if (method === "ORANGE_MONEY") {
    return <span className={frame}><Image src="/brands/orange-money.svg" alt="Orange Money" width={44} height={12} className="h-auto w-full object-contain" /></span>;
  }

  const Icon = method === "CASH"
    ? Banknote
    : method === "BANK_TRANSFER"
      ? Landmark
      : method === "OTHER"
        ? CircleEllipsis
        : method === "CREDIT"
          ? WalletCards
          : CreditCard;
  return <span className={frame} aria-hidden="true"><Icon className="h-4 w-4" /></span>;
}
