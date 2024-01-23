import { InspectorOptions, createInspector } from "./createInspector";
import { Adapter, Inspector, StatelyInspectionEvent } from "./types";
import safeStringify from "fast-safe-stringify";
import { getDevToolsPluginClientAsync } from "expo/devtools";

type DevToolsPluginClient = Awaited<
  ReturnType<typeof getDevToolsPluginClientAsync>
>;

export interface ExpoDevPluginInspectorOptions extends InspectorOptions {
  syncIntervalMs?: number;
}

export class ExpoDevPluginAdapter implements Adapter {
  private client: DevToolsPluginClient;
  private get status() {
    return this.client.isConnected() ? "open" : "closed";
  }
  private deferredEvents: StatelyInspectionEvent[] = [];
  // TODO: Correct typing for React Native's setInterval
  // https://reactnative.dev/docs/timers
  private syncDeferred: NodeJS.Timeout | undefined;
  private options: Required<ExpoDevPluginInspectorOptions>;

  constructor(
    client: DevToolsPluginClient,
    options?: ExpoDevPluginInspectorOptions
  ) {
    this.client = client;
    this.options = {
      filter: () => true,
      serialize: (event) => JSON.parse(safeStringify(event)),
      autoStart: true,
      syncIntervalMs: 1000,
      ...options,
    };
  }
  public start() {
    const start = async () => {
      this.client.addMessageListener(
        "inspector",
        (event: { data: unknown }) => {
          console.warn("unhandled inspector event");

          if (typeof event.data !== "string") {
            return;
          }

          console.log("message", event.data);
        }
      );
      await this.client.initAsync();
      this.syncDeferred = setInterval(() => {
        if (this.status === "open") {
          this.deferredEvents.forEach((deferredEvent) => {
            this.client.sendMessage("inspect", JSON.stringify(deferredEvent));
          });
          this.deferredEvents = [];
        } else {
          this.client.initAsync();
        }
      }, this.options.syncIntervalMs);
    };
    start();
  }
  public stop() {
    this.syncDeferred && clearInterval(this.syncDeferred);
    this.client.closeAsync();
  }
  public send(event: StatelyInspectionEvent) {
    if (this.status === "open") {
      this.client.sendMessage("inspect", JSON.stringify(event));
    } else {
      this.deferredEvents.push(event);
    }
  }
}

export function createExpoDevPluginInspector(
  client: DevToolsPluginClient,
  options?: ExpoDevPluginInspectorOptions
) {
  const adapter = new ExpoDevPluginAdapter(client, options);

  const inspector = createInspector(adapter, options);

  return inspector;
}

export function forwardExpoDevToolsToInspector(
  client: DevToolsPluginClient,
  targetInspector: Inspector<Adapter>
) {
  client.addMessageListener("inspect", (event) =>
    targetInspector.adapter.send(event)
  );
}
