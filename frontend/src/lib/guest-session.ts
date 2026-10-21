import { createGuestSession } from "@/src/lib/api/auth";
import { getAuthState, useAuthStore } from "@/src/lib/stores/auth.store";

let inFlight: Promise<void> | null = null;

/**
 * Makes sure there is a signed-in user, creating a guest session if not.
 *
 * The guest's tokens are stored exactly like a normal login (localStorage),
 * and the server keeps guest refresh tokens valid for a year, so the same
 * browser keeps its bookings next time. Safe to call repeatedly or from
 * several places at once — concurrent callers share one request.
 */
export function ensureSession(): Promise<void> {
  if (getAuthState().accessToken) return Promise.resolve();
  if (!inFlight) {
    inFlight = createGuestSession()
      .then((tokens) => {
        // Another tab/login may have won the race while we were waiting.
        if (!getAuthState().accessToken) {
          useAuthStore.getState().setTokens(tokens);
        }
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}
