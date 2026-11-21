export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "KRTime";

/**
 * From NEXT_PUBLIC_API_BASE_URL only (.env / .env.production / Docker build-arg).
 * No hardcoded host — set the env file for local vs production.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
