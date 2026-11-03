// OpenNext generates this handler at build time. Keep all generated exports.
import handler from "./.open-next/worker.js";
import { runScheduledJobs } from "./cloudflare/scheduler.mjs";
export * from "./.open-next/worker.js";

export default {
  ...handler,
  async scheduled(_controller, env) {
    await runScheduledJobs(env);
  },
};
