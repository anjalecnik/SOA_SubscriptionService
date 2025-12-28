import { AsyncLocalStorage } from 'node:async_hooks';

type Store = { correlationId: string };

export const als = new AsyncLocalStorage<Store>();

export function getCorrelationId(): string | undefined {
  return als.getStore()?.correlationId;
}
