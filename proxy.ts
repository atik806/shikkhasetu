import { NextResponse, type NextRequest } from "next/server";
import { HOME_FOR_ROLE, rolesForPath } from "@/lib/auth/permissions";
import type { Role } from "@/types";

/**
 * Optimistic route protection (Next 16 "proxy", formerly middleware).
 * Reads the MOCK session cookie written on login. This is UX, not security: the future backend
 * must check a signed httpOnly session on every request.
 */
const ROLES: Role[] = ["super_admin", "school_admin", "teacher", "parent", "student", "gate_staff"];

function readSession(req: NextRequest): { u: string; r: Role } | null {
  const raw = req.cookies.get("ss_session")?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(atob(raw)) as { u?: unknown; r?: unknown };
    if (typeof parsed.u === "string" && typeof parsed.r === "string" && ROLES.includes(parsed.r as Role)) return { u: parsed.u, r: parsed.r as Role };
  } catch {
    return null;
  }
  return null;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = readSession(req);
  const allowed = rolesForPath(pathname);

  if (allowed) {
    if (!session) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (!allowed.includes(session.r)) {
      const url = new URL("/forbidden", req.url);
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL(HOME_FOR_ROLE[session.r], req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/parent/:path*", "/student/:path*", "/gate/:path*", "/login"],
};
