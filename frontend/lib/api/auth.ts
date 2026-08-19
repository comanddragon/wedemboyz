import { apiClient, unwrap } from "./client";
import type { AuthTokens, LoginInput, RegisterInput } from "@/types";

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
