import { CONTROL_TOWER_CONFIG } from './config.js';

const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/;

export function isGoogleAnalyticsMeasurementId(value) {
  return typeof value === 'string' && GA_MEASUREMENT_ID_PATTERN.test(value.trim());
}

export function loadGoogleAnalytics(
  config = CONTROL_TOWER_CONFIG,
  { documentRef = globalThis.document, windowRef = globalThis.window } = {}
) {
  const measurementId = config.googleAnalyticsMeasurementId?.trim();
  if (!isGoogleAnalyticsMeasurementId(measurementId) || !documentRef?.head || !windowRef) {
    return false;
  }

  windowRef.dataLayer = windowRef.dataLayer || [];
  windowRef.gtag = windowRef.gtag || function gtag() {
    windowRef.dataLayer.push(arguments);
  };

  windowRef.gtag('js', new Date());
  windowRef.gtag('config', measurementId);

  const scriptSrc = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  if (!documentRef.querySelector(`script[src="${scriptSrc}"]`)) {
    const script = documentRef.createElement('script');
    script.async = true;
    script.src = scriptSrc;
    documentRef.head.append(script);
  }

  return true;
}

loadGoogleAnalytics();
