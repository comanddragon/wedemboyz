"use client";

import NextLink, { type LinkProps } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { AnchorHTMLAttributes } from "react";
import { localeFromPathname, localizeHref, stripLocale } from "./config";

type Props = LinkProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>;

export function LocalizedLink({ href, ...props }: Props) {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const localized = typeof href === "string" ? localizeHref(href, locale) : href;
  return <NextLink href={localized} {...props} />;
}

export function useLocalizedRouter() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  return {
    ...router,
    push: (href: string) => router.push(localizeHref(href, locale)),
    replace: (href: string) => router.replace(localizeHref(href, locale)),
  };
}

export { stripLocale };
