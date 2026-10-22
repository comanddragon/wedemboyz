'use client'

import { usePathname } from 'next/navigation'
import { PublicNav } from './PublicNav'
import { PublicFooter } from './PublicFooter'
import { stripLocale } from '@/src/i18n/config'

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
    const routePathname = stripLocale(pathname)
    const hide = hiddenRoutes.some(route => routePathname.startsWith(route))

    return (
        <>
            {!hide && <PublicNav />}
            {children}
            {!hide && <PublicFooter />}
        </>
    )
}
