/**
 * Empty-state welcome copy for dashboard surfaces.
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
        Import a file. EchoReadly prepares natural AI audio — then you listen.
      </p>
    </header>
  );
}
