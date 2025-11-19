/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { signal, WritableSignal } from '@angular/core';
import { ResourceState } from './resource-state.model';

export abstract class BaseStore<
  TEnum extends Record<string, string | number>,
  TData extends { [K in keyof TEnum]: ResourceState<unknown> },
> {
  private readonly signalsState = new Map<
    keyof TEnum,
    WritableSignal<TData[keyof TEnum]>
  >();

  protected constructor(protected readonly storeEnum: TEnum) {
    this.initializeState();
  }

  get<K extends keyof TData>(key: K) {
    return this.signalsState.get(key.toString()) as WritableSignal<TData[K]>;
  }

  update<K extends keyof TData>(key: K, newState: Partial<TData[K]>) {
    const currentState = this.signalsState.get(key.toString());
    if (!currentState) {
      return;
    }
    currentState.update((state) => ({
      ...state,
      ...newState,
    }));
  }

  clearAll() {
    Object.keys(this.storeEnum).forEach((key) => {
      this.clear(key as keyof TData);
    });
  }

  clear<K extends keyof TData>(key: K) {
    const currentState = this.signalsState.get(key.toString());
    if (!currentState) {
      return;
    }
    const _typedKey = key as keyof TEnum;
    currentState.set({
      data: undefined,
      isLoading: false,
      status: undefined,
    } as TData[typeof _typedKey]);
  }

  startLoading<K extends keyof TData>(key: K) {
    const currentState = this.signalsState.get(key.toString());
    if (!currentState) {
      return;
    }

    const _typedKey = key as keyof TEnum;
    currentState.update(
      (state) =>
        ({
          ...state,
          status: undefined,
          isLoading: true,
          errors: undefined,
        }) as TData[typeof _typedKey]
    );
  }

  private initializeState() {
    Object.keys(this.storeEnum).forEach((key) => {
      const _typedKey = key as keyof TEnum;
      const initialState: ResourceState<unknown> = {
        data: undefined,
        isLoading: false,
        status: undefined,
        errors: undefined,
      };
      this.signalsState.set(
        _typedKey,
        signal<TData[typeof _typedKey]>(initialState as TData[typeof _typedKey])
      );
    });
  }
}
