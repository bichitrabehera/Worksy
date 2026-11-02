export { auth as middleware } from "./auth";

export const config = {
  matcher: ["/((?!api/auth|signin|signup|_next/static|_next/image|favicon.ico).*)"],
};
