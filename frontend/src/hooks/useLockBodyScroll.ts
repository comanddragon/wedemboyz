"use client";

import { useEffect } from "react";

/**
 * Locks page scroll while `active` is true — for mobile overlay drawers
 * (sidebars, modals) that sit on top of a `fixed` backdrop. Without this,
 * the page underneath stays scrollable and touch input on the drawer can
 * drag the whole body with it (especially on iOS Safari, where `position:
 * fixed` visibly detaches from a scrolling page). Restores whatever the
 * previous overflow value was on cleanup, so nested/sequential locks don't
 * clobber each other.
 */
export function useLockBodyScroll(active: boolean) {
    useEffect(() => {
        if (!active) return;

        const { body } = document;
        const previousOverflow = body.style.overflow;
        const previousOverscroll = body.style.overscrollBehavior;

        body.style.overflow = "hidden";
        body.style.overscrollBehavior = "contain";

        return () => {
            body.style.overflow = previousOverflow;
            body.style.overscrollBehavior = previousOverscroll;
        };
    }, [active]);
}
