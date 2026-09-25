"use client";

const ID_KEY = "signaldesk:anonymous-id";
const SESSION_KEY = "signaldesk:last-session-event";
const SESSION_WINDOW_MS = 6 * 60 * 60 * 1000;

function anonymousId() {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(ID_KEY, id);
  }
  return id;
}

export function trackTraction(
  event: string,
  properties: Record<string, string | number | undefined> = {},
) {
  if (typeof window === "undefined") return;

  const id = anonymousId();
  if (!id) return;

  void fetch("/api/traction", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({event, anonymousId: id, properties}),
    keepalive: true,
  }).catch(() => undefined);
}

export function trackSession() {
  if (typeof window === "undefined") return;
  const previous = Number(window.localStorage.getItem(SESSION_KEY) ?? 0);
  const now = Date.now();
  if (Number.isFinite(previous) && now - previous < SESSION_WINDOW_MS) return;
  window.localStorage.setItem(SESSION_KEY, String(now));
  trackTraction("session");
}
