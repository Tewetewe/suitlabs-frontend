export type APIStatusDetail =
  | { online: true; baseURL: string }
  | { online: false; baseURL: string; message?: string };

const EVENT_NAME = 'suitlabs:api-status';

export function emitAPIStatus(detail: APIStatusDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<APIStatusDetail>(EVENT_NAME, { detail }));
}

export function onAPIStatus(handler: (detail: APIStatusDetail) => void) {
  if (typeof window === 'undefined') return () => {};

  const listener = (e: Event) => {
    const ce = e as CustomEvent<APIStatusDetail>;
    if (ce.detail) handler(ce.detail);
  };
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}

