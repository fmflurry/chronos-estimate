/* eslint-disable */
import { of } from 'rxjs';
import { BaseStore } from '../base.store';
import { StoreEnum } from '../resource-state.model';

export const CACHE_NO_TIMEOUT = Infinity;

const cacheTimestamps = new WeakMap<
  BaseStore<any, any>,
  Map<StoreEnum, number>
>();

function getCacheTimestamp(
  store: BaseStore<any, any>,
  key: StoreEnum
): number | undefined {
  const storeMap = cacheTimestamps.get(store);
  return storeMap?.get(key);
}

function setCacheTimestamp(
  store: BaseStore<any, any>,
  key: StoreEnum,
  timestamp: number
): void {
  let storeMap = cacheTimestamps.get(store);
  if (!storeMap) {
    storeMap = new Map();
    cacheTimestamps.set(store, storeMap);
  }
  storeMap.set(key, timestamp);
}

function clearCacheTimestamp(store: BaseStore<any, any>, key: StoreEnum): void {
  const storeMap = cacheTimestamps.get(store);
  storeMap?.delete(key);
}

/**
 * Cache decorator that bypasses the use-case call if we already have a valid cache state in the store.
 *
 * This decorator checks if the store already contains a state with a defined status OR if it's currently loading.
 * If a valid cache state exists, the method execution is skipped. Otherwise, the original method is executed.
 *
 * Cache conditions (method execution is skipped when):
 * - `status` is defined (any status: 'Success', 'Error') OR
 * - `isLoading` is true
 * - AND timeout has not been exceeded (if timeoutMs is provided)
 *
 * Execute conditions (method is executed when):
 * - `status` is undefined AND `isLoading` is false/undefined (initial state)
 * - Store or signal is not available (fallback behavior)
 * - Timeout has been exceeded
 *
 * @param storeKey - The store key to check for cached data
 * @param getStore - Function that returns the store instance from the class instance
 * @param returnObservable - If true, returns an Observable with cached data when cache is hit
 * @param timeoutMs - Timeout in milliseconds, default to 5 minutes. Use `CACHE_NO_TIMEOUT` to disable expiration. Cache will be cleared automatically when exceeded
 *
 * @example
 * ```typescript
 * @AppCache(DebStoreEnum.PARAMETERS, (instance) => instance.store, false, 30000)
 * @AutoStartLoading(DebStoreEnum.PARAMETERS)
 * loadParametersForCompany(companyId: string) {
 *   this.parameters
 *     .getFor(companyId)
 *     .pipe(handleStoreLoading(this.store, DebStoreEnum.PARAMETERS))
 *     .subscribe();
 * }
 * ```
 */
export function AppCache<T extends StoreEnum>(
  storeKey: T,
  getStore: (instance: any) => BaseStore<any, any> | undefined,
  returnObservable = false,
  timeoutMs = 5 * 60 * 1000
) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const store = getStore(this);

      if (!store) {
        return originalMethod.apply(this, args);
      }

      const storeSignal = store.get(storeKey);
      if (!storeSignal) {
        return originalMethod.apply(this, args);
      }

      const cachedTimestamp = getCacheTimestamp(store, storeKey);
      const now = Date.now();
      if (cachedTimestamp === undefined) {
        setTimeout(() => {
          setCacheTimestamp(store, storeKey, now);
        });
        return originalMethod.apply(this, args);
      }

      const isExpired =
        cachedTimestamp !== undefined && now - cachedTimestamp >= timeoutMs;

      if (isExpired) {
        clearCacheTimestamp(store, storeKey);
        setTimeout(() => {
          setCacheTimestamp(store, storeKey, now);
        });
        return originalMethod.apply(this, args);
      }

      const currentState = storeSignal();
      const hasValidCache = currentState?.status || currentState?.isLoading;

      if (hasValidCache) {
        if (returnObservable) {
          return of(currentState.data);
        }

        return;
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
