/** Server-only retry runner. Never import this module into client components. */
export async function runScheduledJobs(env, fetcher = fetch) {
  if (!env.INTERNAL_JOBS_SECRET) {
    throw new Error("Missing INTERNAL_JOBS_SECRET: email retries cannot run");
  }
  const endpoint = new URL(env.INTERNAL_JOBS_URL);
  if (endpoint.protocol !== "https:") {
    throw new Error("INTERNAL_JOBS_URL must use HTTPS");
  }
  const response = await fetcher(endpoint.toString(), {
    method: "POST",
    headers: { "X-Internal-Jobs-Secret": env.INTERNAL_JOBS_SECRET },
    redirect: "error",
    signal: AbortSignal.timeout(55000),
  });
  if (!response.ok) {
    throw new Error(
      `Background jobs endpoint returned HTTP ${response.status}`,
    );
  }
  const result = await response.json();
  for (const key of ["claimed", "succeeded", "retried", "failed"]) {
    if (!Number.isInteger(result[key]) || result[key] < 0) {
      throw new Error("Background jobs endpoint returned an invalid result");
    }
  }
  // Counts only: do not log secrets, email addresses, or message contents.
  console.log("Background jobs runner", result);
  if (result.failed > 0) {
    throw new Error(
      `${result.failed} background job(s) exhausted their retries`,
    );
  }
  return result;
}
