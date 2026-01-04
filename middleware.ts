import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Only protect admin routes
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
        const adminUser = process.env.ADMIN_USER;
        const adminPassword = process.env.ADMIN_PASSWORD;

        // Fail-safe: Block all access if credentials not configured
        if (!adminUser || !adminPassword) {
            return new NextResponse('Admin access not configured', {
                status: 503,
                headers: { 'Cache-Control': 'no-store' }
            });
        }

        // Check for Basic Auth header
        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Basic ')) {
            return new NextResponse('Authentication required', {
                status: 401,
                headers: {
                    'WWW-Authenticate': 'Basic realm="Admin Area"',
                    'Cache-Control': 'no-store',
                },
            });
        }

        // Decode and verify credentials
        try {
            const base64Credentials = authHeader.slice(6);
            const credentials = atob(base64Credentials);
            const [user, pass] = credentials.split(':');

            if (user !== adminUser || pass !== adminPassword) {
                return new NextResponse('Invalid credentials', {
                    status: 401,
                    headers: {
                        'WWW-Authenticate': 'Basic realm="Admin Area"',
                        'Cache-Control': 'no-store',
                    },
                });
            }
        } catch {
            return new NextResponse('Invalid authorization header', {
                status: 401,
                headers: {
                    'WWW-Authenticate': 'Basic realm="Admin Area"',
                    'Cache-Control': 'no-store',
                },
            });
        }

        // Auth successful - add security headers
        const response = NextResponse.next();
        response.headers.set('Cache-Control', 'no-store');
        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/api/admin/:path*'],
};
