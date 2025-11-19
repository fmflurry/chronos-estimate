import { of, throwError } from 'rxjs';
import { handleStoreLoading, HandleStoreLoadingOptions } from './handle-store-loading.operator';
import { BaseStore } from '../base.store';
import { ResourceState } from '../resource-state.model';
import { HttpErrorResponse } from '@angular/common/http';
import { vi } from 'vitest';

enum TestEnum {
  Data = 'Data',
}

interface TestState {
  [TestEnum.Data]: ResourceState<string>;
}

describe('handleStoreLoading', () => {
  let store: BaseStore<typeof TestEnum, TestState>;

  beforeEach(() => {
    store = new (class extends BaseStore<typeof TestEnum, TestState> {
      constructor() {
        super(TestEnum);
      }
    })();
    vi.spyOn(store, 'update');
  });

  it('should update store with success state when observable emits', () => {
    const testData = 'test data';
    const source$ = of(testData);

    return new Promise<void>((resolve, reject) => {
      source$.pipe(handleStoreLoading(store, TestEnum.Data)).subscribe({
        next: (result) => {
          try {
            expect(result).toBe(testData);
            expect(store.update).toHaveBeenCalledWith(TestEnum.Data, {
              data: testData,
              isLoading: false,
              status: 'Success',
            });
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        error: reject,
      });
    });
  });

  it('should return the error message when observable throws', () => {
    const error = new HttpErrorResponse({ error: new Error('test error') });
    const source$ = throwError(() => error);

    return new Promise<void>((resolve, reject) => {
      source$.pipe(handleStoreLoading(store, TestEnum.Data)).subscribe({
        next: () => reject(new Error('Should have thrown')),
        error: (e) => {
          try {
            expect(e).toBeInstanceOf(HttpErrorResponse);
            expect(e.error.message).toBe('test error');
            resolve();
          } catch (error) {
            reject(error);
          }
        },
      });
    });
  });

  it('should update store with error state when observable throws', () => {
    const httpError = new HttpErrorResponse({
      error: { errors: [{ code: '123', message: 'test error' }] },
    });
    const source$ = throwError(() => httpError);

    return new Promise<void>((resolve, reject) => {
      source$.pipe(handleStoreLoading(store, TestEnum.Data)).subscribe({
        next: () => reject(new Error('Should have thrown')),
        error: (e) => {
          try {
            expect(e).toBeInstanceOf(HttpErrorResponse);
            expect(store.update).toHaveBeenCalledWith(TestEnum.Data, {
              data: undefined,
              isLoading: false,
              status: 'Error',
              errors: [
                {
                  code: '123',
                  message: 'test error',
                },
              ],
            });
            resolve();
          } catch (error) {
            reject(error);
          }
        },
      });
    });
  });

  it('should pass through the emitted value', () => {
    const testData = 'test data';
    const source$ = of(testData);

    return new Promise<void>((resolve, reject) => {
      source$.pipe(handleStoreLoading(store, TestEnum.Data)).subscribe({
        next: (result) => {
          try {
            expect(result).toBe(testData);
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        error: reject,
      });
    });
  });

  it('should not complete after first emission when completeOnFirstEmission is false', () => {
    const testData1 = 'test data 1';
    const testData2 = 'test data 2';
    // Create an observable that emits multiple values
    const source$ = of(testData1, testData2);
    const options: HandleStoreLoadingOptions = {
      completeOnFirstEmission: false,
    };

    const values: string[] = [];

    return new Promise<void>((resolve, reject) => {
      source$.pipe(handleStoreLoading(store, TestEnum.Data, options)).subscribe({
        next: (result) => {
          values.push(result);
          if (values.length === 2) {
            try {
              expect(values).toEqual([testData1, testData2]);
              expect(store.update).toHaveBeenCalledTimes(2);
              resolve();
            } catch (error) {
              reject(error);
            }
          }
        },
        error: reject,
        complete: () => {
          // This should be called after both values are emitted
          try {
            expect(values.length).toBe(2);
          } catch (error) {
            reject(error);
          }
        },
      });
    });
  });
});
