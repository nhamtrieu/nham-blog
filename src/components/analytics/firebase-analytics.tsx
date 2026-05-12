import { Suspense } from "react";

import { FirebaseAnalyticsPageTracker } from "@/components/analytics/firebase-analytics-page-tracker";
import { shouldEnableFirebaseAnalytics } from "@/lib/analytics/firebase-analytics";

export function FirebaseAnalytics() {
  if (!shouldEnableFirebaseAnalytics) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <FirebaseAnalyticsPageTracker />
    </Suspense>
  );
}
