const GTM_ID = "GTM-MP3QJ9HC";
const GTM_DATA_LAYER = "dataLayer";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

function runWhenIdle(task: () => void, timeoutMs = 4000) {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(task, { timeout: timeoutMs });
    return;
  }

  window.setTimeout(task, 1500);
}

function loadGoogleTagManager() {
  if (document.querySelector(`script[data-gtm-id="${GTM_ID}"]`)) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer?.push({
    "gtm.start": Date.now(),
    event: "gtm.js"
  });

  const script = document.createElement("script");
  script.async = true;
  script.dataset.gtmId = GTM_ID;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(script);
}

export function scheduleDeferredMonitoring() {
  const schedule = () => runWhenIdle(loadGoogleTagManager);

  if (document.readyState === "complete") {
    schedule();
    return;
  }

  window.addEventListener("load", schedule, { once: true });
}
