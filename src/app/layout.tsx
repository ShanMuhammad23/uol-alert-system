import "@/css/satoshi.css";
import "@/css/style.css";

import { Sidebar } from "@/components/Layouts/sidebar";

import "flatpickr/dist/flatpickr.min.css";
import "jsvectormap/dist/jsvectormap.css";

import { Header } from "@/components/Layouts/header";
import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import type { PropsWithChildren } from "react";
import { Providers } from "./providers";
import { getCurrentUser } from "./(home)/fetch";

export const metadata: Metadata = {
  title: {
    template: "UOL | Student Early Alert System",
    default: "UOL | Student Early Alert System",
  },
  description:
    "UOL | Student Early Alert System",
};

export default async function RootLayout({ children }: PropsWithChildren) {
  const user = await getCurrentUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <NextTopLoader color="#5750F1" showSpinner={false} />

          <div className="flex min-h-screen">
            <Sidebar user={user} />

            <div className="w-full bg-gray-2 dark:bg-[#020d1a]">
              <Header user={user} />

              <main className="isolate mx-auto w-full max-w-screen-2xl overflow-hidden p-2">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
