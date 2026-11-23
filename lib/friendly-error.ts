import { ApiError } from "@/lib/api";

/** User-facing copy — never raw status dumps or field names. */
export function friendlyError(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof ApiError) {
    const msg = (err.message || "").trim();
    if (!msg) return fallback;
    if (/dioexception|socketexception|traceback|sqlalchemy|psycopg|uuid|column/i.test(msg)) {
      return fallback;
    }
    return msg;
  }
  if (err instanceof Error) {
    const msg = err.message.trim();
    if (!msg || /failed to fetch|networkerror|load failed/i.test(msg)) {
      return "Can’t reach the server. Check your connection.";
    }
    return msg.length > 140 ? fallback : msg;
  }
  return fallback;
}

export function humanStatus(raw: string | null | undefined): string {
  switch ((raw ?? "").toLowerCase()) {
    case "open":
      return "Checked in";
    case "complete":
    case "completed":
      return "Completed";
    case "on_leave":
      return "On leave";
    case "absent":
      return "Absent";
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "cancelled":
    case "canceled":
      return "Cancelled";
    case "active":
      return "Active";
    case "inactive":
      return "Inactive";
    case "revoked":
      return "Revoked";
    case "reset_requested":
      return "Reset requested";
    case "missing_checkout":
      return "Missing check-out";
    default:
      if (!raw) return "—";
      return raw.replaceAll("_", " ");
  }
}
