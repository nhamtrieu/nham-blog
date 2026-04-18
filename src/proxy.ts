import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

import { ADMIN_HOME_PATH, ADMIN_LOGIN_PATH } from "@/lib/auth/auth-routes";

export default withAuth(
  function proxy(request) {
    if (request.nextUrl.pathname === ADMIN_LOGIN_PATH && request.nextauth.token) {
      const redirectUrl = request.nextUrl.clone();

      redirectUrl.pathname = ADMIN_HOME_PATH;
      redirectUrl.search = "";

      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: ADMIN_LOGIN_PATH,
    },
    callbacks: {
      authorized: ({ req, token }) => {
        if (req.nextUrl.pathname === ADMIN_LOGIN_PATH) {
          return true;
        }

        return Boolean(token);
      },
    },
  }
);

export const config = {
  matcher: ["/admin/:path*"],
};
