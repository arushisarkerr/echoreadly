/**
 * Analytics feature — client-safe exports.
 * Server: import track-event / overview directly.
 */

export { AnalyticsWorkspace } from "./analytics-workspace";
export {
  fetchAnalyticsOverview,
  reportCollectionAnalytics,
} from "./analytics-client";
export { useAnalytics, type UseAnalyticsState } from "./use-analytics";
export type {
  AnalyticsOverview,
  AnalyticsKpis,
  AnalyticsSeriesPoint,
  AnalyticsActivityItem,
} from "./types";
