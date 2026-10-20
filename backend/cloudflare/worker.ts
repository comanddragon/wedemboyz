import { DurableObject } from "cloudflare:workers";

type RuntimeEnv = {
  BACKEND: DurableObjectNamespace<DjangoApi>;
  [name: string]: unknown;
};

export class DjangoApi extends DurableObject<RuntimeEnv> {
  private runtimeEnvironment(): Record<string, string> {
    const values = Object.entries(this.env).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    );

    return {
      ...Object.fromEntries(values),
      DJANGO_SETTINGS_MODULE: "config.settings.production",
      PORT: "8080",
    };
  }

  private async ensureContainer(): Promise<void> {
    if (!this.ctx.container.running) {
      this.ctx.container.start({
        image: this.ctx.container.images.base,
        instance: "lite",
        env: this.runtimeEnvironment(),
        enableInternet: true,
      });
    }

    await this.ctx.container.setInactivityTimeout(2 * 60 * 60 * 1000);

    const port = this.ctx.container.getTcpPort(8080);
    for (let attempt = 0; attempt < 120; attempt += 1) {
      try {
        const response = await port.fetch("http://container/healthz");
        await response.body?.cancel();
        if (response.ok) return;
      } catch {
        // The process has not bound its port yet.
      }
      await scheduler.wait(500);
    }

    throw new Error("Django container did not become ready within 60 seconds");
  }

  async fetch(request: Request): Promise<Response> {
    await this.ensureContainer();

    const incomingUrl = new URL(request.url);
    const containerUrl = new URL(request.url);
    containerUrl.protocol = "http:";
    containerUrl.host = "container";

    const forwarded = new Request(containerUrl, request);
    forwarded.headers.delete("host");
    forwarded.headers.set("x-forwarded-host", incomingUrl.host);
    forwarded.headers.set("x-forwarded-proto", incomingUrl.protocol.slice(0, -1));
    return this.ctx.container.getTcpPort(8080).fetch(forwarded);
  }
}

export default {
  fetch(request: Request, env: RuntimeEnv): Promise<Response> {
    // A stable name keeps HTTP requests and WebSocket sessions on the same
    // Django/Channels process. Redis remains the cross-process channel layer.
    return env.BACKEND.getByName("primary").fetch(request);
  },
} satisfies ExportedHandler<RuntimeEnv>;
