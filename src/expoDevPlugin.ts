import { InspectorOptions, createInspector } from "./createInspector";
import { Adapter, StatelyInspectionEvent } from "./types";
import ExpoDevPlugin from "isomorphic-ws";
import safeStringify from "fast-safe-stringify";
import { Observer, Subscribable, toObserver } from "xstate";

export interface ExpoDevPluginInspectorOptions extends InspectorOptions {
  url: string;
}

export class ExpoDevPluginAdapter implements Adapter {
  private ws: ExpoDevPlugin;
  private status = "closed" as "closed" | "open";
  private deferredEvents: StatelyInspectionEvent[] = [];
  private options: Required<ExpoDevPluginInspectorOptions>;

  constructor(options?: ExpoDevPluginInspectorOptions) {
    this.options = {
      filter: () => true,
      serialize: (event) => JSON.parse(safeStringify(event)),
      autoStart: true,
      url: "ws://localhost:8080",
      ...options,
    };
  }
  public start() {
    const start = () => {
      this.ws = new ExpoDevPlugin(this.options.url);

      this.ws.onopen = () => {
        console.log("ExpoDevPlugin open");
        this.status = "open";
        this.deferredEvents.forEach((event) => {
          this.ws.send(JSON.stringify(event));
        });
      };

      this.ws.onclose = () => {
        console.log("ExpoDevPlugin closed");
      };

      this.ws.onerror = async (event: unknown) => {
        console.error("ExpoDevPlugin error", event);
        await new Promise((res) => setTimeout(res, 5000));
        console.warn("restarting");
        start();
      };

      this.ws.onmessage = (event: { data: unknown }) => {
        if (typeof event.data !== "string") {
          return;
        }

        console.log("message", event.data);
      };
    };

    start();
  }
  public stop() {
    this.ws.close();
    this.status = "closed";
  }
  public send(event: StatelyInspectionEvent) {
    if (this.status === "open") {
      this.ws.send(JSON.stringify(event));
    } else {
      this.deferredEvents.push(event);
    }
  }
}

export function createExpoDevPluginInspector(
  options?: ExpoDevPluginInspectorOptions
) {
  const adapter = new ExpoDevPluginAdapter(options);

  const inspector = createInspector(adapter, options);

  return inspector;
}

interface ExpoDevPluginReceiver extends Subscribable<StatelyInspectionEvent> {}

export function createExpoDevPluginReceiver(options?: {
  server: string;
}): ExpoDevPluginReceiver {
  const resolvedOptions = {
    server: "ws://localhost:8080",
    ...options,
  };

  const observers = new Set<Observer<StatelyInspectionEvent>>();

  const ws = new ExpoDevPlugin(resolvedOptions.server);

  ws.onopen = () => {
    console.log("ExpoDevPlugin open");

    ws.onmessage = (event: { data: unknown }) => {
      if (typeof event.data !== "string") {
        return;
      }
      console.log("message", event.data);
      const eventData = JSON.parse(event.data);

      observers.forEach((observer) => {
        observer.next?.(eventData);
      });
    };
  };

  const receiver: ExpoDevPluginReceiver = {
    subscribe(observerOrFn) {
      const observer = toObserver(observerOrFn);
      observers.add(observer);

      return {
        unsubscribe() {
          observers.delete(observer);
        },
      };
    },
  };

  return receiver;
}
