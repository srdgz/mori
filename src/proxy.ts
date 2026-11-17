import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { privatePathnames, routing, type AppLocale } from "./i18n/routing";

const intl = createMiddleware(routing);

function localized(locale: AppLocale, pathname: keyof typeof routing.pathnames): string {
  const entry = routing.pathnames[pathname];
  const path = typeof entry === "string" ? entry : entry[locale];
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}

function matches(template: string, pathname: string): boolean {
  const expected = template.split("/");
  const actual = pathname.split("/");
  return (
    expected.length === actual.length &&
    expected.every((segment, i) => (segment.startsWith("[") && segment.endsWith("]") ? actual[i] !== "" : segment === actual[i]))
  );
}

const signInPath: Record<AppLocale, string> = {
  es: localized("es", "/account/sign-in"),
  en: localized("en", "/account/sign-in"),
};

const privatePaths = routing.locales.flatMap((locale) => privatePathnames.map((p) => ({ locale, path: localized(locale, p) })));

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const match = privatePaths.find(({ path }) => matches(path, pathname));
  if (match && !getSessionCookie(request)) {
    const url = new URL(signInPath[match.locale], request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return intl(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|brand|.*\\..*).*)"],
};
