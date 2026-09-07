// Polyfill worker_threads.markAsUncloneable for Node.js < 21 compatibility (specifically Node 20.20.2)
import worker_threads from "node:worker_threads";
import { AsyncLocalStorage } from "node:async_hooks";
import { WebSocket } from "ws";

// Next 16 reads AsyncLocalStorage from globalThis in its server runtime. Node
// provides that global, while Bun exposes the implementation through
// node:async_hooks only.
const runtimeGlobals = globalThis as typeof globalThis & { AsyncLocalStorage?: typeof AsyncLocalStorage };
if (typeof runtimeGlobals.AsyncLocalStorage === "undefined") {
  Object.defineProperty(globalThis, "AsyncLocalStorage", {
    configurable: true,
    value: AsyncLocalStorage,
    writable: true,
  });
}

interface WorkerThreadsWithCloneMarker {
  markAsUncloneable?: (object: object) => void;
  markAsUntransferable?: (object: object) => void;
}

const cloneMarker = worker_threads as WorkerThreadsWithCloneMarker;
if (!cloneMarker.markAsUncloneable) {
  cloneMarker.markAsUncloneable = function (obj: object) {
    if (worker_threads.markAsUntransferable) {
      try {
        worker_threads.markAsUntransferable(obj);
      } catch {
        // no-op
      }
    }
  };
}

// Polyfill Promise.withResolvers for Node.js < 22 compatibility (specifically Node 20.20.2)
interface PromiseConstructorWithResolvers {
  withResolvers?<T>(): PromiseWithResolvers<T>;
}

interface PromiseWithResolvers<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

const promiseConstructor = Promise as PromiseConstructorWithResolvers;
if (typeof promiseConstructor.withResolvers === "undefined") {
  promiseConstructor.withResolvers = function <T>(): PromiseWithResolvers<T> {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// Polyfill WebSocket for Node.js < 22 compatibility (specifically Node 20.20.2)
if (typeof globalThis.WebSocket === "undefined") {
  Object.defineProperty(globalThis, "WebSocket", {
    configurable: true,
    value: WebSocket,
    writable: true,
  });
}
