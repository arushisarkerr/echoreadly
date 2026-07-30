"use client";

import { ROUTES } from "@/constants";
import {
  ANALYTICS_RANGE_PRESETS,
  eventLabel,
  type AnalyticsEventName,
  type AnalyticsRangePreset,
} from "@/constants/analytics";
import { WorkspaceCanvas } from "@/features/dashboard/workspace-canvas";
import { cn } from "@/utils";

import type { AnalyticsSeriesPoint } from "./types";
import { useAnalytics } from "./use-analytics";

const PRESET_LABELS: Record<AnalyticsRangePreset, string> = {
  today: "Today",
  "7d": "7 days",
  "30d": "30 days",
  custom: "Custom",
};

/**
 * Analytics workspace — KPIs, activity charts, filters, recent feed.
 */
export function AnalyticsWorkspace() {
  const analytics = useAnalytics();
  const overview = analytics.overview;
  const loading = analytics.status === "loading";

  return (
    <WorkspaceCanvas
      kicker="Analytics"
      title="Your listening activity."
      description="Reading time, AI usage, documents, and plan metrics for your account. Aggregated server-side — nothing here slows the Reader."
      actionHref={ROUTES.library}
      actionLabel="Open Library"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <fieldset>
          <legend className="text-xs font-semibold tracking-wide text-subtle uppercase">
            Range
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {ANALYTICS_RANGE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={analytics.preset === preset}
                onClick={() => {
                  if (preset === "custom") {
                    const today = new Date().toISOString().slice(0, 10);
                    const weekAgo = new Date(
                      Date.now() - 6 * 24 * 60 * 60 * 1000,
                    )
                      .toISOString()
                      .slice(0, 10);
                    analytics.setCustomRange(
                      analytics.from || weekAgo,
                      analytics.to || today,
                    );
                    return;
                  }
                  analytics.setPreset(preset);
                }}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  analytics.preset === preset
                    ? "border-foreground bg-foreground text-background"
                    : "border-border/80 bg-background/50 text-foreground hover:bg-surface-muted",
                )}
              >
                {PRESET_LABELS[preset]}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={() => {
            void analytics.refresh();
          }}
          disabled={loading}
          className="inline-flex h-9 items-center justify-center rounded-full border border-border/80 bg-background/50 px-3.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {analytics.preset === "custom" ? (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-xs font-semibold tracking-wide text-subtle uppercase">
              From
            </span>
            <input
              type="date"
              value={analytics.from}
              onChange={(event) => {
                analytics.setCustomRange(event.target.value, analytics.to);
              }}
              className="mt-2 block rounded-2xl border border-border/80 bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold tracking-wide text-subtle uppercase">
              To
            </span>
            <input
              type="date"
              value={analytics.to}
              onChange={(event) => {
                analytics.setCustomRange(analytics.from, event.target.value);
              }}
              className="mt-2 block rounded-2xl border border-border/80 bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>
      ) : null}

      {analytics.error ? (
        <div
          role="alert"
          className="mt-6 rounded-[1.5rem] border border-danger/30 bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-4 py-4"
        >
          <p className="text-sm font-semibold text-danger">
            Couldn’t load analytics
          </p>
          <p className="mt-1 text-sm text-muted">{analytics.error}</p>
          <button
            type="button"
            onClick={() => {
              void analytics.refresh();
            }}
            className="mt-3 inline-flex h-9 items-center rounded-full border border-border px-3.5 text-xs font-semibold text-foreground"
          >
            Try again
          </button>
        </div>
      ) : null}

      {loading && !overview ? (
        <p className="mt-8 text-sm text-muted" role="status">
          Loading your analytics…
        </p>
      ) : null}

      {overview ? (
        <div className="mt-8 space-y-8">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Documents"
              value={String(overview.kpis.totalDocuments)}
              hint={`${overview.kpis.documentsInRange} in range`}
            />
            <KpiCard
              label="Reading time"
              value={`${overview.kpis.totalReadingMinutes}m`}
              hint={`${overview.kpis.readingMinutesInRange}m in range`}
            />
            <KpiCard
              label="AI requests"
              value={String(overview.kpis.totalAiRequests)}
              hint={`${overview.kpis.aiRequestsInRange} in range`}
            />
            <KpiCard
              label="Reading streak"
              value={`${overview.kpis.readingStreakDays}d`}
              hint={
                overview.kpis.mostUsedAiFeature
                  ? `Top AI: ${eventLabel(overview.kpis.mostUsedAiFeature as AnalyticsEventName)}`
                  : "No AI usage in range"
              }
            />
          </section>

          <section className="rounded-[1.5rem] border border-border/70 bg-surface/50 px-5 py-5">
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Activity trends
            </h2>
            <p className="mt-1 text-sm text-muted">
              Daily totals for reading, documents, and AI features in the
              selected range.
            </p>
            <div className="mt-5 space-y-5">
              <BarChart
                title="Reading (minutes)"
                series={overview.series}
                valueKey="readingMinutes"
                color="var(--accent)"
              />
              <BarChart
                title="Documents uploaded"
                series={overview.series}
                valueKey="documents"
              />
              <BarChart
                title="AI usage"
                series={overview.series}
                valueKey="ai"
              />
              <div className="grid gap-5 lg:grid-cols-2">
                <BarChart
                  title="Listen modes"
                  series={overview.series}
                  valueKey="summary"
                />
                <BarChart
                  title="Advanced"
                  series={overview.series}
                  valueKey="chat"
                />
                <BarChart
                  title="Translation"
                  series={overview.series}
                  valueKey="translation"
                />
                <BarChart
                  title="TTS"
                  series={overview.series}
                  valueKey="tts"
                />
                <BarChart
                  title="Export"
                  series={overview.series}
                  valueKey="export"
                />
                <BarChart
                  title="Streaming AI"
                  series={overview.series}
                  valueKey="streaming"
                />
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[1.5rem] border border-border/70 bg-surface/50 px-5 py-5">
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                Plan usage
              </h2>
              <p className="mt-1 text-sm text-muted">
                {overview.plan.planName} · {overview.plan.status.replaceAll("_", " ")}
              </p>
              <ul className="mt-4 space-y-3">
                {Object.keys(overview.plan.limits).map((metric) => {
                  const used = Number(overview.plan.usage[metric] ?? 0);
                  const limit = Number(overview.plan.limits[metric] ?? 0);
                  const unlimited = limit < 0;
                  const pct = unlimited
                    ? 0
                    : limit === 0
                      ? used > 0
                        ? 100
                        : 0
                      : Math.min(100, Math.round((used / limit) * 100));
                  return (
                    <li key={metric}>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold capitalize text-foreground">
                          {metric}
                        </span>
                        <span className="text-muted">
                          {used}
                          {unlimited ? " / ∞" : ` / ${limit}`}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-background/70">
                        <div
                          className="h-full rounded-full bg-foreground/80"
                          style={{ width: `${unlimited ? 8 : pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rounded-[1.5rem] border border-border/70 bg-surface/50 px-5 py-5">
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                Recent activity
              </h2>
              <p className="mt-1 text-sm text-muted">
                Latest listening actions on your account.
              </p>
              {overview.recentActivity.length === 0 ? (
                <p className="mt-6 text-sm text-muted">
                  No activity yet. Upload a document or generate a summary to
                  start your feed.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {overview.recentActivity.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-2xl border border-border/60 bg-background/40 px-3.5 py-3"
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {item.label}
                      </p>
                      <p className="mt-1 text-xs text-subtle">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-border/70 bg-surface/50 px-5 py-5">
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Reading snapshot
            </h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold tracking-wide text-subtle uppercase">
                  Pages reached
                </dt>
                <dd className="mt-1 text-lg font-semibold text-foreground">
                  {overview.kpis.pagesReadEstimate}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-subtle uppercase">
                  Docs completed
                </dt>
                <dd className="mt-1 text-lg font-semibold text-foreground">
                  {overview.kpis.documentsCompletedEstimate}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-subtle uppercase">
                  Range
                </dt>
                <dd className="mt-1 text-sm font-semibold text-foreground">
                  {overview.range.from} → {overview.range.to}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      ) : null}
    </WorkspaceCanvas>
  );
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-surface/50 px-4 py-4">
      <p className="text-xs font-semibold tracking-wide text-subtle uppercase">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

function BarChart({
  title,
  series,
  valueKey,
  color = "var(--foreground)",
}: {
  title: string;
  series: AnalyticsSeriesPoint[];
  valueKey: keyof AnalyticsSeriesPoint;
  color?: string;
}) {
  const values = series.map((point) => Number(point[valueKey]) || 0);
  const max = Math.max(1, ...values);
  const empty = values.every((value) => value === 0);

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-subtle">
          {empty ? "No data" : `peak ${max}`}
        </p>
      </div>
      <div
        className="mt-2 flex h-24 items-end gap-1 rounded-2xl border border-border/60 bg-background/40 px-2 py-2"
        role="img"
        aria-label={`${title} chart`}
      >
        {series.map((point) => {
          const value = Number(point[valueKey]) || 0;
          const height = empty ? 4 : Math.max(4, Math.round((value / max) * 100));
          return (
            <div
              key={`${title}-${point.day}`}
              className="flex min-w-0 flex-1 flex-col items-center justify-end"
              title={`${point.day}: ${value}`}
            >
              <div
                className="w-full max-w-[14px] rounded-t-md opacity-90"
                style={{
                  height: `${height}%`,
                  background: color,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
