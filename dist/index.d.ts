import { InspectionEvent, Snapshot, AnyActorRef, AnyEventObject, Observer, Subscribable } from 'xstate';
import { getDevToolsPluginClientAsync } from 'expo/devtools';

interface StatelyBaseInspectionEvent {
    rootId: string | undefined;
    sessionId: string;
    createdAt: string;
    id: string;
    _version: string;
}
type StatelySnapshotEvent = Pick<InspectionEvent & {
    type: '@xstate.snapshot';
}, 'event' | 'rootId' | 'snapshot' | 'type'> & StatelyBaseInspectionEvent;
type StatelyEventEvent = Pick<InspectionEvent & {
    type: '@xstate.event';
}, 'event' | 'rootId' | 'type'> & {
    sourceId: string | undefined;
} & StatelyBaseInspectionEvent;
type StatelyActorEvent = Pick<InspectionEvent & {
    type: '@xstate.actor';
}, 'type'> & {
    name: string;
    snapshot: InspectedSnapshot;
    definition: string | undefined;
    parentId: string | undefined;
} & StatelyBaseInspectionEvent;
type StatelyInspectionEvent = StatelySnapshotEvent | StatelyEventEvent | StatelyActorEvent;
interface Adapter {
    start?: () => void;
    stop?: () => void;
    send(event: StatelyInspectionEvent): void;
}
interface InspectedSnapshot {
    status?: Snapshot<unknown>['status'];
    context?: any;
    value?: any;
    output?: any;
}
interface Inspector<TAdapter extends Adapter> {
    adapter: TAdapter;
    /**
     * Sends a snapshot inspection event. This represents the state of the actor.
     */
    snapshot(actor: AnyActorRef | string, snapshot: InspectedSnapshot, info?: {
        event?: AnyEventObject;
    }): void;
    /**
     * Sends an event inspection event. This represents the event that was sent to the actor.
     */
    event(actor: AnyActorRef | string, event: AnyEventObject | string, info?: {
        source?: AnyActorRef | string;
    }): void;
    /**
     * Sends an actor registration inspection event. This represents the actor that was created.
     */
    actor(actor: AnyActorRef | string, snapshot?: InspectedSnapshot, info?: {
        definition?: string;
        parentId?: string;
        rootId?: string;
    }): void;
    /**
     * Starts the inspector.
     */
    start: () => void;
    /**
     * Stops the inspector.
     */
    stop: () => void;
    /**
     * An inspection observer that can be passed into XState.
     * @example
     * ```js
     * import { createActor } from 'xstate';
     * import { createInspector } from '@xstate/inspect';
     * // ...
     *
     * const inspector = createInspector(...)
     *
     * const actor = createActor(someMachine, {
     *   inspect: inspector.inspect
     * })
     * ```
     */
    inspect: Observer<InspectionEvent>;
}

interface InspectorOptions {
    filter?: (event: StatelyInspectionEvent) => boolean;
    serialize?: (event: StatelyInspectionEvent) => StatelyInspectionEvent;
    /**
     * Whether to automatically start the inspector.
     *
     * @default true
     */
    autoStart?: boolean;
}
declare function createInspector<TAdapter extends Adapter>(adapter: TAdapter, options?: InspectorOptions): Inspector<TAdapter>;

interface WebSocketInspectorOptions extends InspectorOptions {
    url: string;
}
declare class WebSocketAdapter implements Adapter {
    private ws;
    private status;
    private deferredEvents;
    private options;
    constructor(options?: WebSocketInspectorOptions);
    start(): void;
    stop(): void;
    send(event: StatelyInspectionEvent): void;
}
declare function createWebSocketInspector(options?: WebSocketInspectorOptions): Inspector<WebSocketAdapter>;
interface WebSocketReceiver extends Subscribable<StatelyInspectionEvent> {
}
declare function createWebSocketReceiver(options?: {
    server: string;
}): WebSocketReceiver;

interface BrowserReceiver extends Subscribable<StatelyInspectionEvent> {
}
interface BrowserInspectorOptions extends InspectorOptions {
    url?: string;
    window?: Window;
    iframe?: HTMLIFrameElement | null;
}
/**
 * Creates a browser-based inspector that sends events to a remote inspector window.
 * The remote inspector opens an inspector window at the specified URL by default.
 */
declare function createBrowserInspector(options?: BrowserInspectorOptions): Inspector<BrowserAdapter>;
interface BrowserReceiverOptions {
    window?: Window;
    /**
     * The number of events from the current event to replay
     */
    replayCount?: number;
}
declare function createBrowserReceiver(options?: BrowserReceiverOptions): BrowserReceiver;
declare class BrowserAdapter implements Adapter {
    options: Required<BrowserInspectorOptions>;
    private status;
    private deferredEvents;
    targetWindow: Window | null;
    constructor(options: Required<BrowserInspectorOptions>);
    start(): void;
    stop(): void;
    send(event: StatelyInspectionEvent): void;
}

type DevToolsPluginClient = Awaited<ReturnType<typeof getDevToolsPluginClientAsync>>;
interface ExpoDevPluginInspectorOptions extends InspectorOptions {
}
declare class ExpoDevPluginAdapter implements Adapter {
    private createClient;
    private client?;
    private get status();
    private deferredEvents;
    private options;
    constructor(createClient: () => Promise<DevToolsPluginClient>, options?: ExpoDevPluginInspectorOptions);
    start(): void;
    stop(): void;
    send(event: StatelyInspectionEvent): void;
}
declare function createExpoDevPluginInspector(createClient: () => Promise<DevToolsPluginClient>, options?: ExpoDevPluginInspectorOptions): Inspector<ExpoDevPluginAdapter>;

export { Adapter, Inspector, StatelyActorEvent, StatelyEventEvent, StatelyInspectionEvent, StatelySnapshotEvent, createBrowserInspector, createBrowserReceiver, createExpoDevPluginInspector, createInspector, createWebSocketInspector, createWebSocketReceiver };
