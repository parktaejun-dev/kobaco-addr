import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // Determine which auth to use based on path
    const isSalesRoute = pathname.startsWith('/sales') || pathname.startsWith('/api/sales');
    const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');

    let requiredUser: string | undefined;
    let requiredPassword: string | undefined;
    let realm: string;

    if (isSalesRoute) {
        requiredUser = process.env.SALES_USER;
        requiredPassword = process.env.SALES_PASSWORD;
        realm = 'Sales Area';
    } else if (isAdminRoute) {
        requiredUser = process.env.ADMIN_USER;
        requiredPassword = process.env.ADMIN_PASSWORD;
        realm = 'Admin Area';
    } else {
        // Should not happen due to matcher, but fail safe
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // Fail-safe: Block all access if credentials not configured
    if (!requiredUser || !requiredPassword) {
        return new NextResponse('Access not configured', {
            status: 401,
            headers: { 'Cache-Control': 'no-store' }
        });
    }

    // Check for Basic Auth header
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return new NextResponse('Authentication required', {
            status: 401,
            headers: {
                'WWW-Authenticate': `Basic realm="${realm}"`,
                'Cache-Control': 'no-store',
            },
        });
    }

    // Decode and verify credentials (Edge-compatible)
    try {
        const base64Credentials = authHeader.slice(6);
        const credentials = atob(base64Credentials);
        const [user, pass] = credentials.split(':');

        if (user !== requiredUser || pass !== requiredPassword) {
            return new NextResponse('Invalid credentials', {
                status: 401,
                headers: {
                    'WWW-Authenticate': `Basic realm="${realm}"`,
                    'Cache-Control': 'no-store',
                },
            });
        }
    } catch {
        return new NextResponse('Invalid authorization header', {
            status: 401,
            headers: {
                'WWW-Authenticate': `Basic realm="${realm}"`,
                'Cache-Control': 'no-store',
            },
        });
    }

    // Auth successful - add security headers
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store');
    return response;
}

// IMPORTANT: Paths that trigger the middleware
export const config = {
    matcher: [
        '/admin',
        '/admin/(.*)',
        '/api/admin/(.*)',
        '/sales/:path*',
        '/api/sales/:path*',
    ],
};
