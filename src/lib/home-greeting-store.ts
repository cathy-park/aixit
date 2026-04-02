const KEY = "aixit.homeGreetingName.v1";

export const DEFAULT_HOME_GREETING_NAME = "대표";
export const HOME_GREETING_UPDATED_EVENT = "aixit-home-greeting-updated";

export function loadHomeGreetingName(): string {
  if (typeof window === "undefined") return DEFAULT_HOME_GREETING_NAME;
  const v = window.localStorage.getItem(KEY)?.trim();
  return v && v.length > 0 ? v : DEFAULT_HOME_GREETING_NAME;
}

export function saveHomeGreetingName(name: string) {
  if (typeof window === "undefined") return;
  const t = name.trim();
  if (!t) {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(HOME_GREETING_UPDATED_EVENT));
    return;
  }
  window.localStorage.setItem(KEY, t);
  window.dispatchEvent(new Event(HOME_GREETING_UPDATED_EVENT));
}
