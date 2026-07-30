"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { BillingInterval } from "@/constants";

import {
  fetchBillingStatus,
  requestBillingCheckout,
  requestBillingPortal,
} from "./billing-client";
import type { BillingEntitlement } from "./types";

export type UseBillingState = {
  status: "loading" | "ready" | "error" | "redirecting";
  entitlement: BillingEntitlement | null;
  error: string | null;
  refresh: () => Promise<void>;
  startCheckout: (interval: BillingInterval) => Promise<void>;
  openPortal: () => Promise<void>;
};

/**
 * Settings billing card state — status, checkout, portal.
 */
export function useBilling(): UseBillingState {
  const [status, setStatus] = useState<UseBillingState["status"]>("loading");
  const [entitlement, setEntitlement] = useState<BillingEntitlement | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    const result = await fetchBillingStatus();
    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }
    setEntitlement(result.data);
    setError(null);
    setStatus("ready");
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await fetchBillingStatus();
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setError(result.error);
        setStatus("error");
        return;
      }
      setEntitlement(result.data);
      setError(null);
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const startCheckout = useCallback(async (interval: BillingInterval) => {
    if (inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    setError(null);
    setStatus("redirecting");

    try {
      const result = await requestBillingCheckout({ interval });
      if (!result.ok) {
        setStatus("error");
        setError(result.error);
        return;
      }
      window.location.assign(result.data.url);
    } catch {
      setStatus("error");
      setError("Unable to start checkout.");
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  const openPortal = useCallback(async () => {
    if (inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    setError(null);
    setStatus("redirecting");

    try {
      const result = await requestBillingPortal();
      if (!result.ok) {
        setStatus("ready");
        setError(result.error);
        return;
      }
      window.location.assign(result.data.url);
    } catch {
      setStatus("ready");
      setError("Unable to open billing portal.");
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  return {
    status,
    entitlement,
    error,
    refresh,
    startCheckout,
    openPortal,
  };
}
