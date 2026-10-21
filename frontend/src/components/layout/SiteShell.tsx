'use client'

import { usePathname } from 'next/navigation'
import { PublicNav } from './PublicNav'
import { PublicFooter } from './PublicFooter'

const hiddenRoutes = [
    '/register',
    '/login',
    '/forgot-password',
    '/dashboard',
    '/book',
    '/chat',
    '/loyalty',
    '/notifications',
    '/orders',
    '/settings',
    '/admin',
    '/contact',
]

export function SiteShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const hide = hiddenRoutes.some(route => pathname.startsWith(route))

    return (
        <>
            {!hide && <PublicNav />}
            {children}
            {!hide && <PublicFooter />}
        </>
    )
}
