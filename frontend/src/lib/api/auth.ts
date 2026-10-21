import { apiClient, unwrap } from "./client";
import type {
  AuthTokens,
  ClaimAccountInput,
  LoginInput,
  RegisterInput,
} from "@/src/types";

/** POST /auth/register/ */
export async function register(input: RegisterInput): Promise<AuthTokens> {
  const res = await apiClient.post("/auth/register/", input);
  return unwrap<AuthTokens>(res);
}

/** POST /auth/login/ — {"phone_number", "password"} */
export async function login(input: LoginInput): Promise<AuthTokens> {
  const res = await apiClient.post("/auth/login/", input);
  return unwrap<AuthTokens>(res);
}

/** POST /auth/logout/ — blacklists the refresh token server-side. */
export async function logout(refresh: string): Promise<void> {
  await apiClient.post("/auth/logout/", { refresh });
}

/** POST /auth/guest/ — anonymous session so someone can book without registering. */
export async function createGuestSession(): Promise<AuthTokens> {
  const res = await apiClient.post("/auth/guest/", {});
  return unwrap<AuthTokens>(res);
}

/** POST /auth/guest/claim/ — upgrades the signed-in guest in place, keeping its orders. */
export async function claimGuestAccount(
  input: ClaimAccountInput,
): Promise<AuthTokens> {
  const res = await apiClient.post("/auth/guest/claim/", input);
  return unwrap<AuthTokens>(res);
}
