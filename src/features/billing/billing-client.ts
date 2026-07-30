/**
 * Client billing API helpers.
 */

import { getApiErrorMessage } from "@/utils";

import type { BillingInterval } from "@/constants";
import type { BillingEntitlement, CheckoutResult, PortalResult } from "./types";

export async function fetchBillingStatus(): Promise<
  { ok: true; data: BillingEntitlement } | { ok: false; error: string }
> {
  const response = await fetch("/api/billing/status", {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const json = (await response.json()) as
    | { ok: true; data: BillingEntitlement }
    | { ok: false; error?: unknown };

  if (!response.ok || !("ok" in json) || !json.ok) {
    return {
      ok: false,
      error: getApiErrorMessage(
        "error" in json ? json.error : undefined,
        "Unable to load billing status.",
      ),
    };
  }

  return { ok: true, data: json.data };
}

export async function requestBillingCheckout(input: {
  interval: BillingInterval;
}): Promise<{ ok: true; data: CheckoutResult } | { ok: false; error: string }> {
  const response = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      planId: "pro",
      interval: input.interval,
    }),
  });

  const json = (await response.json()) as
    | { ok: true; data: CheckoutResult }
    | { ok: false; error?: unknown };

  if (!response.ok || !("ok" in json) || !json.ok) {
    return {
      ok: false,
      error: getApiErrorMessage(
        "error" in json ? json.error : undefined,
        "Unable to start checkout.",
      ),
    };
  }

  return { ok: true, data: json.data };
}

export async function requestBillingPortal(): Promise<
  { ok: true; data: PortalResult } | { ok: false; error: string }
> {
  const response = await fetch("/api/billing/portal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  const json = (await response.json()) as
    | { ok: true; data: PortalResult }
    | { ok: false; error?: unknown };

  if (!response.ok || !("ok" in json) || !json.ok) {
    return {
      ok: false,
      error: getApiErrorMessage(
        "error" in json ? json.error : undefined,
        "Unable to open billing portal.",
      ),
    };
  }

  return { ok: true, data: json.data };
}
