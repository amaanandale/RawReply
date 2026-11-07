import { AuthProvider } from "@/components/shared/auth-provider";
import "./globals.css";

export const metadata = {
  title: "RawReply — Instagram Comment-to-DM Automation",
  description:
    "Automate Instagram comment replies, qualify leads through DM workflows, and export verified phone numbers to Excel.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

