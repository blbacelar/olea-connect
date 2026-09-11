const publicRouteMatchers = [
  (pathname: string) => pathname === "/",
  (pathname: string) => pathname === "/ref",
  (pathname: string) => pathname.startsWith("/ref/"),
  (pathname: string) => pathname === "/referrals",
  (pathname: string) => pathname === "/sponsorship",
  (pathname: string) => pathname === "/login",
  (pathname: string) => pathname === "/reset-password",
  (pathname: string) => pathname === "/update-password",
  (pathname: string) => pathname.startsWith("/signup"),
  (pathname: string) => pathname === "/verify-email",
  (pathname: string) => pathname.startsWith("/auth"),
  (pathname: string) => pathname.startsWith("/onboarding"),
  (pathname: string) => pathname.startsWith("/legal"),
  (pathname: string) => pathname === "/team/invitations/accept",
];

export function isPublicRoute(pathname: string) {
  return publicRouteMatchers.some((matches) => matches(pathname));
}
