import Image from "next/image";
import { Package } from "lucide-react";
import type { OrderItem } from "@/src/types";

export function OrderItemPreviews({ items = [] }: { items?: OrderItem[] }) {
  return (
    <span className="flex shrink-0 items-center -space-x-2" aria-hidden="true">
      {items.slice(0, 3).map((item) => {
        const photo = item.photos?.[0]?.image ?? item.photo;
        return (
          <span
            key={item.id}
            className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-lg bg-steam ring-2 ring-white"
          >
            {photo ? (
              <Image
                src={photo}
                alt=""
                fill
                unoptimized
                sizes="44px"
                className="object-cover"
              />
            ) : (
              <Package className="h-5 w-5 text-ink-muted" />
            )}
          </span>
        );
      })}
      {items.length > 3 ? (
        <span className="relative grid h-11 w-11 place-items-center rounded-lg bg-navy text-xs text-white ring-2 ring-white">
          +{items.length - 3}
        </span>
      ) : null}
    </span>
  );
}
