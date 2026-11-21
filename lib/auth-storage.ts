const ACCESS_KEY = "krtime_access_token";
const ROLE_KEY = "krtime_role";
const NAME_KEY = "krtime_full_name";

export function saveSession(accessToken: string, role: string, fullName: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ACCESS_KEY, accessToken);
  sessionStorage.setItem(ROLE_KEY, role);
  sessionStorage.setItem(NAME_KEY, fullName);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(ROLE_KEY);
  sessionStorage.removeItem(NAME_KEY);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ACCESS_KEY);
}

export function getStoredRole(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ROLE_KEY);
}

export function getStoredName(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(NAME_KEY);
}
