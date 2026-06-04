import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Platform Governance Proxy (Next.js 16+ Migration): 
 * Protects the dashboard perimeter and ensures proper routing.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Root Redirection Baseline
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/next-gen/control-center/customer', request.url));
  }

  // 2. Control Center Sentinel (Placeholder for Auth check)
  if (pathname.startsWith('/next-gen/control-center')) {
     // Architectural hook for Session/JWT verification.
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Apply to all routes except internal Next.js paths and static assets
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};
