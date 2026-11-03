import test from "node:test";
import assert from "node:assert/strict";
import { runScheduledJobs } from "./scheduler.mjs";

const env = {
  INTERNAL_JOBS_URL: "https://api.example.com/internal/jobs/run",
  INTERNAL_JOBS_SECRET: "test-secret",
};
const counts = { claimed: 2, succeeded: 1, retried: 1, failed: 0 };

test("authenticated POST to the backend, without following redirects", async () => {
  let calls = 0;
  const result = await runScheduledJobs(env, async (url, options) => {
    calls++;
    assert.equal(url, env.INTERNAL_JOBS_URL);
    assert.equal(options.method, "POST");
    assert.equal(
      options.headers["X-Internal-Jobs-Secret"],
      env.INTERNAL_JOBS_SECRET,
    );
    assert.equal(options.redirect, "error");
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json(counts);
  });
  assert.deepEqual(result, counts);
  assert.equal(calls, 1);
});

test("missing secret fails before making a network request", async () => {
  await assert.rejects(
    runScheduledJobs({}, () => assert.fail("must not fetch")),
    /Missing INTERNAL_JOBS_SECRET/,
  );
});

test("refuses to send the secret over HTTP", async () => {
  await assert.rejects(
    runScheduledJobs({ ...env, INTERNAL_JOBS_URL: "http://example.com" }, () =>
      assert.fail("must not fetch"),
    ),
    /HTTPS/,
  );
});

for (const status of [400, 404, 429, 500]) {
  test(`HTTP ${status} is visible as a failed scheduled invocation`, async () => {
    await assert.rejects(
      runScheduledJobs(env, async () => new Response("", { status })),
      new RegExp(`HTTP ${status}`),
    );
  });
}

test("terminal job failures do not look like a healthy runner", async () => {
  await assert.rejects(
    runScheduledJobs(env, async () => Response.json({ ...counts, failed: 1 })),
    /exhausted/,
  );
});

test("rejects a success response without job counters", async () => {
  await assert.rejects(
    runScheduledJobs(env, async () => Response.json({ status: "ok" })),
    /invalid result/,
  );
});
