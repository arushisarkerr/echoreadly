import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/features/auth";
import { ROUTES } from "@/constants/routes";
import { siteConfig } from "@/config";

export const metadata: Metadata = {
  title: "Login",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md space-y-8">
        <Link
          href={ROUTES.home}
          className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground"
        >
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-md bg-foreground text-[0.7rem] font-semibold text-background"
          >
            Er
          </span>
          {siteConfig.name}
        </Link>

        <Suspense
          fallback={
            <p className="text-sm text-muted">Loading sign-in form…</p>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
