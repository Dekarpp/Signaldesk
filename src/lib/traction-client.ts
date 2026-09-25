"use client";

const ID_KEY = "signaldesk:anonymous-id";
const SESSION_KEY = "signaldesk:last-session-event";
const SESSION_WINDOW_MS = 6 * 60 * 60 * 1000;

export function tractionClientId() {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(ID_KEY, id);
  }
  return id;
}

export async function trackTraction(
  event: string,
  properties: Record<string, string | number | undefined> = {},
) {
  if (typeof window === "undefined") return false;

  const id = tractionClientId();
  if (!id) return false;

  try {
    const response = await fetch("/api/traction", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({event, anonymousId: id, properties}),
      keepalive: true,
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function trackSession() {
  if (typeof window === "undefined") return;
  const previous = Number(window.localStorage.getItem(SESSION_KEY) ?? 0);
  const now = Date.now();
  if (Number.isFinite(previous) && now - previous < SESSION_WINDOW_MS) return;
  window.localStorage.setItem(SESSION_KEY, String(now));
  const source = new URLSearchParams(window.location.search).get("utm_source") ?? undefined;
  void trackTraction("session", {source});
}
