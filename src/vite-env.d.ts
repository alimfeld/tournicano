/// <reference types="vite/client" />

declare module '@graph-algorithm/maximum-matching' {
  // The package ships no type declarations; these describe the two exports used.
  export function weight(graph: Array<[number, number, number]>): Iterable<[number, number]>;
  export function iter(matching: Iterable<[number, number]>): Generator<[number, number], void, unknown>;
}

declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegisteredSW?: (swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: Error) => void;
  }

  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}
