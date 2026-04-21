import type { ComponentType } from "react";
import { useEffect, useState } from "react";

type SpeedInsightsComponent = ComponentType | null;

function scheduleLoad(task: () => void, timeoutMs = 4000) {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(task, { timeout: timeoutMs });
    return;
  }

  window.setTimeout(task, 1500);
}

export function DeferredSpeedInsights() {
  const [SpeedInsights, setSpeedInsights] = useState<SpeedInsightsComponent>(null);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      import("@vercel/speed-insights/react")
        .then((module) => {
          if (!cancelled) {
            setSpeedInsights(() => module.SpeedInsights);
          }
        })
        .catch(() => {
          // Ignore monitoring failures so product UX stays unaffected.
        });
    };

    const onReady = () => scheduleLoad(load);

    if (document.readyState === "complete") {
      onReady();
    } else {
      window.addEventListener("load", onReady, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", onReady);
    };
  }, []);

  return SpeedInsights ? <SpeedInsights /> : null;
}
