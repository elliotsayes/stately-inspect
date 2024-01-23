"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  createBrowserInspector: () => createBrowserInspector,
  createBrowserReceiver: () => createBrowserReceiver,
  createExpoDevPluginInspector: () => createExpoDevPluginInspector,
  createInspector: () => createInspector,
  createWebSocketInspector: () => createWebSocketInspector,
  createWebSocketReceiver: () => createWebSocketReceiver
});
module.exports = __toCommonJS(src_exports);

// src/utils.ts
function toEventObject(event) {
  if (typeof event === "string") {
    return { type: event };
  }
  return event;
}

// package.json
var package_default = {
  devDependencies: {
    "@changesets/changelog-github": "^0.5.0",
    "@changesets/cli": "^2.26.2",
    "@types/jsdom": "^21.1.6",
    expo: "^50.0.2",
    jsdom: "^23.0.0",
    tsup: "^7.2.0",
    typescript: "^5.1.6",
    vitest: "^0.34.6",
    xstate: "^5.5.1"
  },
  name: "@statelyai/inspect",
  version: "0.2.0",
  description: "Inspection utilities for state, actors, workflows, and state machines.",
  main: "dist/index.js",
  repository: "https://github.com/statelyai/inspect.git",
  author: "David Khourshid <davidkpiano@gmail.com>",
  license: "MIT",
  dependencies: {
    "fast-safe-stringify": "^2.1.1",
    "isomorphic-ws": "^5.0.0"
  },
  peerDependencies: {
    expo: "*",
    xstate: "^5.5.1"
  },
  peerDependenciesMeta: {
    expo: {
      optional: true
    }
  },
  scripts: {
    build: "tsup src/index.ts --dts",
    watch: "tsup src/index.ts --dts --watch",
    test: "vitest",
    prepublishOnly: "tsup src/index.ts --dts",
    changeset: "changeset",
    release: "changeset publish",
    version: "changeset version"
  },
  publishConfig: {
    access: "public"
  }
};

// src/idleCallback.ts
function idleCallback(cb) {
  if (typeof window !== "undefined") {
    const raf = window.requestIdleCallback || window.requestAnimationFrame;
    raf(cb);
  } else {
    setTimeout(cb, 0);
  }
}

// src/createInspector.ts
var import_fast_safe_stringify = __toESM(require("fast-safe-stringify"));
function getRoot(actorRef) {
  let marker = actorRef;
  do {
    marker = marker._parent;
  } while (marker?._parent);
  return marker;
}
function getRootId(actorRefOrId) {
  const rootActorRef = typeof actorRefOrId === "string" ? void 0 : getRoot(actorRefOrId)?.sessionId;
  return rootActorRef ?? void 0;
}
function createInspector(adapter, options) {
  function sendAdapter(event) {
    if (options?.filter && !options.filter(event)) {
      return;
    }
    const serializedEvent = options?.serialize?.(event) ?? event;
    adapter.send(serializedEvent);
  }
  const inspector = {
    adapter,
    actor: (actorRef, snapshot, info) => {
      const sessionId = typeof actorRef === "string" ? actorRef : actorRef.sessionId;
      const definitionObject = actorRef?.logic?.config;
      const definition = definitionObject ? JSON.stringify(definitionObject) : void 0;
      const rootId = info?.rootId ?? typeof actorRef === "string" ? void 0 : getRootId(actorRef);
      const parentId = info?.parentId ?? typeof actorRef === "string" ? void 0 : actorRef._parent?.sessionId;
      const name = definitionObject ? definitionObject.id : sessionId;
      sendAdapter({
        type: "@xstate.actor",
        name,
        sessionId,
        createdAt: Date.now().toString(),
        _version: package_default.version,
        rootId,
        parentId,
        id: null,
        definition,
        snapshot: snapshot ?? { status: "active" }
      });
    },
    event: (target, event, info) => {
      const sessionId = typeof target === "string" ? target : target.sessionId;
      const sourceId = !info?.source ? void 0 : typeof info.source === "string" ? info.source : info.source.sessionId;
      sendAdapter({
        type: "@xstate.event",
        sourceId,
        sessionId,
        event: toEventObject(event),
        id: Math.random().toString(),
        createdAt: Date.now().toString(),
        rootId: "anonymous",
        _version: package_default.version
      });
    },
    snapshot: (actor, snapshot, info) => {
      const sessionId = typeof actor === "string" ? actor : actor.sessionId;
      sendAdapter({
        type: "@xstate.snapshot",
        snapshot: {
          status: "active",
          ...snapshot
        },
        event: info?.event ?? { type: "" },
        sessionId,
        id: null,
        createdAt: Date.now().toString(),
        rootId: "anonymous",
        _version: package_default.version
      });
    },
    inspect: {
      next: (event) => {
        idleCallback(function inspectNext() {
          const convertedEvent = convertXStateEvent(event);
          sendAdapter(convertedEvent);
        });
      }
    },
    start() {
      adapter.start?.();
    },
    stop() {
      adapter.stop?.();
    }
  };
  return inspector;
}
function convertXStateEvent(inspectionEvent) {
  switch (inspectionEvent.type) {
    case "@xstate.actor": {
      const actorRef = inspectionEvent.actorRef;
      const logic = actorRef?.logic;
      const definitionObject = logic?.config;
      let name = actorRef.id;
      if (name === actorRef.sessionId && definitionObject) {
        name = definitionObject.id;
      }
      const definitionString = typeof definitionObject === "object" ? JSON.stringify(definitionObject, (key, value) => {
        if (typeof value === "function") {
          return { type: value.name };
        }
        return value;
      }) : JSON.stringify({
        id: name
      });
      return {
        name,
        type: "@xstate.actor",
        definition: definitionString,
        _version: package_default.version,
        createdAt: Date.now().toString(),
        id: null,
        rootId: inspectionEvent.rootId,
        parentId: inspectionEvent.actorRef._parent?.sessionId,
        sessionId: inspectionEvent.actorRef.sessionId,
        snapshot: inspectionEvent.actorRef.getSnapshot()
      };
    }
    case "@xstate.event": {
      return {
        type: "@xstate.event",
        event: inspectionEvent.event,
        sourceId: inspectionEvent.sourceRef?.sessionId,
        // sessionId: inspectionEvent.targetRef.sessionId,
        sessionId: inspectionEvent.actorRef.sessionId,
        _version: package_default.version,
        createdAt: Date.now().toString(),
        id: null,
        rootId: inspectionEvent.rootId
      };
    }
    case "@xstate.snapshot": {
      return {
        type: "@xstate.snapshot",
        event: inspectionEvent.event,
        snapshot: JSON.parse((0, import_fast_safe_stringify.default)(inspectionEvent.snapshot)),
        sessionId: inspectionEvent.actorRef.sessionId,
        _version: package_default.version,
        createdAt: Date.now().toString(),
        id: null,
        rootId: inspectionEvent.rootId
      };
    }
    default: {
      throw new Error(
        `Invalid inspection event type: ${inspectionEvent.type}`
      );
    }
  }
}

// src/webSocket.ts
var import_isomorphic_ws = __toESM(require("isomorphic-ws"));
var import_fast_safe_stringify2 = __toESM(require("fast-safe-stringify"));
var import_xstate = require("xstate");
var WebSocketAdapter = class {
  ws;
  status = "closed";
  deferredEvents = [];
  options;
  constructor(options) {
    this.options = {
      filter: () => true,
      serialize: (event) => JSON.parse((0, import_fast_safe_stringify2.default)(event)),
      autoStart: true,
      url: "ws://localhost:8080",
      ...options
    };
  }
  start() {
    const start = () => {
      this.ws = new import_isomorphic_ws.default(this.options.url);
      this.ws.onopen = () => {
        console.log("websocket open");
        this.status = "open";
        this.deferredEvents.forEach((event) => {
          this.ws.send(JSON.stringify(event));
        });
      };
      this.ws.onclose = () => {
        console.log("websocket closed");
      };
      this.ws.onerror = async (event) => {
        console.error("websocket error", event);
        await new Promise((res) => setTimeout(res, 5e3));
        console.warn("restarting");
        start();
      };
      this.ws.onmessage = (event) => {
        if (typeof event.data !== "string") {
          return;
        }
        console.log("message", event.data);
      };
    };
    start();
  }
  stop() {
    this.ws.close();
    this.status = "closed";
  }
  send(event) {
    if (this.status === "open") {
      this.ws.send(JSON.stringify(event));
    } else {
      this.deferredEvents.push(event);
    }
  }
};
function createWebSocketInspector(options) {
  const adapter = new WebSocketAdapter(options);
  const inspector = createInspector(adapter, options);
  return inspector;
}
function createWebSocketReceiver(options) {
  const resolvedOptions = {
    server: "ws://localhost:8080",
    ...options
  };
  const observers = /* @__PURE__ */ new Set();
  const ws = new import_isomorphic_ws.default(resolvedOptions.server);
  ws.onopen = () => {
    console.log("websocket open");
    ws.onmessage = (event) => {
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
  const receiver = {
    subscribe(observerOrFn) {
      const observer = (0, import_xstate.toObserver)(observerOrFn);
      observers.add(observer);
      return {
        unsubscribe() {
          observers.delete(observer);
        }
      };
    }
  };
  return receiver;
}

// src/browser.ts
var import_xstate2 = require("xstate");
var import_fast_safe_stringify3 = __toESM(require("fast-safe-stringify"));

// src/useless.ts
var UselessAdapter = class {
  constructor() {
  }
  start() {
  }
  stop() {
  }
  send(_event) {
  }
};

// src/browser.ts
var CONNECTION_EVENT = "@statelyai.connected";
function isEventObject(event) {
  return typeof event === "object" && event !== null && typeof event.type === "string";
}
function isStatelyInspectionEvent(event) {
  return typeof event === "object" && event !== null && typeof event.type === "string" && typeof event._version === "string";
}
function createBrowserInspector(options) {
  const resolvedWindow = options?.window ?? (typeof window === "undefined" ? void 0 : window);
  if (!resolvedWindow) {
    console.error("Window does not exist; inspector cannot be started.");
    return new UselessAdapter();
  }
  const resolvedOptions = {
    url: "https://stately.ai/inspect",
    filter: () => true,
    serialize: (event) => JSON.parse((0, import_fast_safe_stringify3.default)(event)),
    autoStart: true,
    iframe: null,
    ...options,
    window: resolvedWindow
  };
  const adapter = new BrowserAdapter(resolvedOptions);
  const inspector = createInspector(adapter, resolvedOptions);
  if (resolvedOptions.autoStart) {
    inspector.start();
  }
  return inspector;
}
var defaultBrowserReceiverOptions = {
  replayCount: 0,
  window: typeof window !== "undefined" ? window : void 0
};
function createBrowserReceiver(options) {
  const resolvedOptions = {
    ...defaultBrowserReceiverOptions,
    ...options
  };
  const browserWindow = resolvedOptions.window;
  const targetWindow = browserWindow.self === browserWindow.top ? browserWindow.opener : browserWindow.parent;
  const observers = /* @__PURE__ */ new Set();
  browserWindow.addEventListener("message", (event) => {
    if (!isStatelyInspectionEvent(event.data)) {
      return;
    }
    observers.forEach((observer) => observer.next?.(event.data));
  });
  const receiver = {
    subscribe(observerOrFn) {
      const observer = (0, import_xstate2.toObserver)(observerOrFn);
      observers.add(observer);
      return {
        unsubscribe() {
          observers.delete(observer);
        }
      };
    }
  };
  if (targetWindow) {
    targetWindow.postMessage(
      {
        type: CONNECTION_EVENT
      },
      "*"
    );
  }
  return receiver;
}
var BrowserAdapter = class {
  constructor(options) {
    this.options = options;
  }
  status = "disconnected";
  deferredEvents = [];
  targetWindow = null;
  start() {
    this.targetWindow = this.options.iframe ? null : this.options.window.open(String(this.options.url), "xstateinspector");
    if (this.options.iframe) {
      this.options.iframe.addEventListener("load", () => {
        this.targetWindow = this.options.iframe?.contentWindow ?? null;
      });
      this.options.iframe?.setAttribute("src", String(this.options.url));
    }
    this.options.window.addEventListener("message", (event) => {
      if (isEventObject(event.data) && event.data.type === "@statelyai.connected") {
        this.status = "connected";
        this.deferredEvents.forEach((event2) => {
          const serializedEvent = this.options.serialize(event2);
          this.targetWindow?.postMessage(serializedEvent, "*");
        });
      }
    });
  }
  stop() {
    this.targetWindow?.postMessage({ type: "@statelyai.disconnected" }, "*");
    this.status = "disconnected";
  }
  send(event) {
    const shouldSendEvent = this.options.filter(event);
    if (!shouldSendEvent) {
      return;
    }
    if (this.status === "connected") {
      const serializedEvent = this.options.serialize(event);
      this.targetWindow?.postMessage(serializedEvent, "*");
    }
    this.deferredEvents.push(event);
  }
};

// src/expoDevPlugin.ts
var import_fast_safe_stringify4 = __toESM(require("fast-safe-stringify"));
var ExpoDevPluginAdapter = class {
  createClient;
  client;
  get status() {
    return this.client?.isConnected() ? "open" : "closed";
  }
  deferredEvents = [];
  options;
  constructor(createClient, options) {
    this.createClient = createClient;
    this.options = {
      filter: () => true,
      serialize: (event) => JSON.parse((0, import_fast_safe_stringify4.default)(event)),
      autoStart: true,
      ...options
    };
  }
  start() {
    const start = () => this.createClient().then((client) => {
      this.client = client;
      client.addMessageListener("inspector", (event) => {
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
  stop() {
    this.client?.closeAsync();
  }
  send(event) {
    if (this.status === "open") {
      this.client.sendMessage("inspect", JSON.stringify(event));
    } else {
      this.deferredEvents.push(event);
    }
  }
};
function createExpoDevPluginInspector(createClient, options) {
  const adapter = new ExpoDevPluginAdapter(createClient, options);
  const inspector = createInspector(adapter, options);
  return inspector;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createBrowserInspector,
  createBrowserReceiver,
  createExpoDevPluginInspector,
  createInspector,
  createWebSocketInspector,
  createWebSocketReceiver
});
