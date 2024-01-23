import { InspectorOptions, createInspector } from "./createInspector";
import { Adapter, Inspector, StatelyInspectionEvent } from "./types";
import safeStringify from "fast-safe-stringify";
import { getDevToolsPluginClientAsync } from "expo/devtools";

type DevToolsPluginClient = Awaited<
  ReturnType<typeof getDevToolsPluginClientAsync>
>;

export interface ExpoDevPluginInspectorOptions extends InspectorOptions {}

export class ExpoDevPluginAdapter implements Adapter {
  private createClient: () => Promise<DevToolsPluginClient>;
  private client?: DevToolsPluginClient;
  private get status() {
    return this.client?.isConnected() ? "open" : "closed";
  }
  private deferredEvents: StatelyInspectionEvent[] = [];
  private options: Required<ExpoDevPluginInspectorOptions>;

  constructor(
    createClient: () => Promise<DevToolsPluginClient>,
    options?: ExpoDevPluginInspectorOptions
  ) {
    this.createClient = createClient;
    this.options = {
      filter: () => true,
      serialize: (event) => JSON.parse(safeStringify(event)),
      autoStart: true,
      ...options,
    };
  }
  public start() {
    const start = () =>
      this.createClient().then((client) => {
        this.client = client;
        client.addMessageListener("inspector", (event: { data: unknown }) => {
          console.warn("unhandled inspector event");

          if (typeof event.data !== "string") {
            return;
          }

          console.log("message", event.data);
        });
        this.deferredEvents.forEach((deferredEvent) => {
          client.sendMessage("inspect", JSON.stringify(deferredEvent));
        });
        this.deferredEvents = [];
      });
    start();
  }
  public stop() {
    this.client?.closeAsync();
    this.client = undefined;
  }
  public send(event: StatelyInspectionEvent) {
    if (this.status === "open") {
      this.client!.sendMessage("inspect", JSON.stringify(event));
    } else {
      this.deferredEvents.push(event);
    }
  }
}

export function createExpoDevPluginInspector(
  createClient: () => Promise<DevToolsPluginClient>,
  options?: ExpoDevPluginInspectorOptions
) {
  const adapter = new ExpoDevPluginAdapter(createClient, options);

  const inspector = createInspector(adapter, options);

  return inspector;
}

export function forwardExpoDevToolsToInspector(
  client: DevToolsPluginClient,
  targetInspector: Inspector<Adapter>
) {
  return client.addMessageListener("inspect", (event) =>
    targetInspector.adapter.send(event)
  );
}
