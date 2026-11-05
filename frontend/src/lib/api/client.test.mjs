import { expect, test } from "bun:test";
import axios, { AxiosError } from "axios";

// Set the adapter before importing the client so refresh requests use it too.
let respond;
axios.defaults.adapter = (config) => respond(config);
const { apiClient } = await import("./client.ts");
const { useAuthStore } = await import("../stores/auth.store.ts");

function session(accessToken, refreshToken) {
  useAuthStore.setState({ accessToken, refreshToken });
}

const response = async (config) => ({
  config, data: {}, status: 200, statusText: "OK", headers: {},
});
const unauthorized = async (config) => {
  throw new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, undefined, {
    config, data: {}, status: 401, statusText: "Unauthorized", headers: {},
  });
};

test("refresh unwraps the envelope, persists rotation, and shares concurrent refreshes", async () => {
  session("expired", "refresh-1");
  let refreshes = 0;
  respond = async (config) => {
    if (config.url === "/auth/token/refresh/") {
      refreshes++;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return { config, data: { success: true, data: { access: "fresh", refresh: "refresh-2" } }, status: 200, statusText: "OK", headers: {} };
    }
    return config.headers.Authorization === "Bearer fresh" ? response(config) : unauthorized(config);
  };
  await Promise.all([apiClient.get("/users/me/"), apiClient.get("/orders/")]);
  expect(refreshes).toBe(1);
  expect(useAuthStore.getState().accessToken).toBe("fresh");
  expect(useAuthStore.getState().refreshToken).toBe("refresh-2");
});

test("a late guest 401 cannot clear the staff session", async () => {
  session("guest", "guest-refresh");
  respond = async (config) => {
    session("staff", "staff-refresh");
    return unauthorized(config);
  };
  await expect(apiClient.get("/users/me/")).rejects.toThrow("Unauthorized");
  expect(useAuthStore.getState().accessToken).toBe("staff");
});

test("a rejected refresh clears the current session", async () => {
  session("expired", "invalid-refresh");
  respond = unauthorized;
  await expect(apiClient.get("/users/me/")).rejects.toThrow("Unauthorized");
  expect(useAuthStore.getState().accessToken).toBeNull();
});
