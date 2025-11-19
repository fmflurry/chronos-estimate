import { finalize, Observable, take, tap } from 'rxjs';
import { BaseStore } from '../base.store';
import { HttpErrorResponse } from '@angular/common/http';
import { ResourceState } from '../resource-state.model';

export interface HandleStoreLoadingOptions {
  completeOnFirstEmission?: boolean;
  callbackAfterComplete?: () => void;
}

// eslint-disable-next-line max-lines-per-function
export function handleStoreLoading<
  TEnum extends Record<string, string | number>,
  TData extends { [K in keyof TEnum]: ResourceState<unknown> }
>(
  store: BaseStore<TEnum, TData>,
  key: keyof TEnum,
  options: HandleStoreLoadingOptions = { completeOnFirstEmission: true }
) {
  return <R>(source: Observable<R>) => {
    let pipeline = source.pipe(
      tap({
        next: (data: R) => {
          store.update(key, {
            data,
            isLoading: false,
            status: 'Success',
            errors: undefined,
          } as Partial<TData[typeof key]>);
        },
        error: (error: HttpErrorResponse) => {
          store.update(key, {
            data: undefined,
            isLoading: false,
            status: 'Error',
            errors: error.error?.errors ?? [
              {
                code: error.status.toString(),
                message: error.message,
              },
            ],
          } as Partial<TData[typeof key]>);
        },
      })
    );

    if (options.completeOnFirstEmission) {
      pipeline = pipeline.pipe(take(1));
    }

    if (options.callbackAfterComplete) {
      pipeline = pipeline.pipe(finalize(options.callbackAfterComplete));
    }

    return pipeline;
  };
}
