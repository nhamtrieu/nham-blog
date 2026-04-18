import { env } from "@/env";

/** Builds an absolute URL from `APP_URL` and a pathname starting with `/`. */
export function absoluteUrl(pathname: string) {
  const base = env.APP_URL.replace(/\/$/, "");
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}`;
}
