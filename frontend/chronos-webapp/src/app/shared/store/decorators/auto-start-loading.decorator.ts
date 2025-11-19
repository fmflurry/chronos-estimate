/* eslint-disable */
import { StoreEnum } from '../resource-state.model';

export function AutoStartLoading<T extends StoreEnum>(storeKey: T) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const store = (this as any).store;
      store.startLoading(storeKey);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
