"use client";

import { getAnalytics, isSupported, logEvent, setAnalyticsCollectionEnabled } from "firebase/analytics";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import {
  getFirebaseApp,
  isTrackableHostname,
  shouldEnableFirebaseAnalytics,
} from "@/lib/analytics/firebase-analytics";

let analyticsBootstrapPromise: Promise<boolean> | null = null;

async function ensureFirebaseAnalyticsReady() {
  if (!analyticsBootstrapPromise) {
    analyticsBootstrapPromise = (async () => {
      if (!shouldEnableFirebaseAnalytics || !isTrackableHostname(window.location.hostname)) {
        return false;
      }

      const supported = await isSupported();

      if (!supported) {
        return false;
      }

      const analytics = getAnalytics(getFirebaseApp());
      setAnalyticsCollectionEnabled(analytics, true);
      return true;
    })();
  }

  return analyticsBootstrapPromise;
}

export function FirebaseAnalyticsPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    let isCancelled = false;

    void ensureFirebaseAnalyticsReady().then((enabled) => {
      if (!enabled || isCancelled) {
        return;
      }

      const query = searchParams.toString();
      const pagePath = query ? `${pathname}?${query}` : pathname;
      const analytics = getAnalytics(getFirebaseApp());

      logEvent(analytics, "page_view", {
        page_location: window.location.href,
        page_path: pagePath,
        page_title: document.title,
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [pathname, searchParams]);

  return null;
}
