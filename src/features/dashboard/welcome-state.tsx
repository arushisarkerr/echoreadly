/**
 * Empty-state welcome copy for the dashboard home route.
 */
export function DashboardWelcomeState() {
  return (
    <header className="mx-auto max-w-2xl text-center">
      <h1
        id="dashboard-welcome-heading"
        className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
      >
        Welcome to EchoReadly
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
        Upload a PDF to start reading, listening and learning.
      </p>
    </header>
  );
}
