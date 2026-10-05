import "./globals.css";
import { Providers } from "./providers";
export const metadata = { title: "CampusNest", description: "College and hostel management foundation" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><Providers>{children}</Providers></body></html>; }
