import { DashboardWelcomeState } from "@/features/dashboard";
import { UploadCard } from "@/features/upload";

/**
 * Dashboard home — welcome copy plus the PDF upload experience (UI only).
 */
export default function DashboardPage() {
  return (
    <section
      aria-labelledby="dashboard-welcome-heading"
      className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16"
    >
      <DashboardWelcomeState />
      <UploadCard />
    </section>
  );
}
