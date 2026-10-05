import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
const protectedRoute = createRouteMatcher(["/admin(.*)", "/warden(.*)", "/student(.*)"]);
export default clerkMiddleware(async (auth, request) => { if (protectedRoute(request)) await auth.protect(); });
export const config = { matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"] };
