import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

import { getAuthState, useAuthStore } from "@/lib/stores/auth.store";
import type { AuthTokens } from "@/types";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

// ngrok's free tier serves a browser-only HTML warning page (based on the
// request's Accept header) in front of the real response, for any tunnel
// URL — that interstitial has none of the Django backend's CORS headers,
// which the browser reports as a CORS error even though the backend's own
// CORS config is fine. This header opts every request out of it. Harmless
// against a non-ngrok API_BASE_URL (e.g. localhost, or ngrok's paid static
// domains without the interstitial) — the backend just ignores it.
const NGROK_SKIP_WARNING_HEADERS = { "ngrok-skip-browser-warning": "true" };

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: NGROK_SKIP_WARNING_HEADERS,
});

// Separate, interceptor-free instance for the refresh call itself — using
// `apiClient` here would recurse back into the 401 handler below.
const refreshClient = axios.create({ baseURL: API_BASE_URL, headers: NGROK_SKIP_WARNING_HEADERS });

apiClient.interceptors.request.use((config) => {
  const { accessToken } = getAuthState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

declare module "axios" {
  // Marks a request as already retried once, so we never loop forever on a
  // persistently-401ing endpoint.
  export interface InternalAxiosRequestConfig {
    _retried?: boolean;
  }
}

// Multiple requests can 401 at the same moment (e.g. a page firing several
// queries at once); this ensures only one refresh call is in flight and
// every queued request awaits the same promise instead of each racing to
// refresh the token themselves.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const { refreshToken } = getAuthState();
  if (!refreshToken) {
    throw new Error("No refresh token available.");
  }

  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<{ access: string }>("/auth/token/refresh/", { refresh: refreshToken })
      .then((res) => {
        useAuthStore.getState().setAccessToken(res.data.access);
        return res.data.access;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig | undefined;

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retried) {
      throw error;
    }

    // Don't attempt to refresh off of the auth endpoints themselves.
    if (originalRequest.url?.includes("/auth/")) {
      throw error;
    }

    originalRequest._retried = true;

    try {
      const newAccessToken = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      useAuthStore.getState().clearAuth();
      throw refreshError;
    }
  }
);

/** Unwraps core.renderers.EnvelopeJSONRenderer's `{ success, data }` shape. */
export function unwrap<T>(response: { data: { success: true; data: T } }): T {
  return response.data.data;
}

export type { AuthTokens };
