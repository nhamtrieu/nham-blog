import { FirebaseAnalyticsPageTracker } from "@/components/analytics/firebase-analytics-page-tracker";
import { shouldEnableFirebaseAnalytics } from "@/lib/analytics/firebase-analytics";

export function FirebaseAnalytics() {
  if (!shouldEnableFirebaseAnalytics) {
    return null;
  }

  return <FirebaseAnalyticsPageTracker />;
}
