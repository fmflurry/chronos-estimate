import { AppCache, CACHE_NO_TIMEOUT } from './app-cache.decorator';
import { BaseStore } from '../base.store';
import { ResourceState } from '../resource-state.model';
import { vi, type MockInstance } from 'vitest';

enum TestStoreEnum {
  TEST_KEY = 'TEST_KEY',
  ANOTHER_KEY = 'ANOTHER_KEY',
}

interface TestStoreState {
  [TestStoreEnum.TEST_KEY]: ResourceState<string>;
  [TestStoreEnum.ANOTHER_KEY]: ResourceState<number>;
}

describe('AppCache decorator', () => {
  let store: BaseStore<typeof TestStoreEnum, TestStoreState>;
  let testClass: TestClass;
  let originalMethodSpy: MockInstance;

  beforeEach(() => {
    store = new (class extends BaseStore<typeof TestStoreEnum, TestStoreState> {
      constructor() {
        super(TestStoreEnum);
      }
    })();

    testClass = new TestClass(store);
    originalMethodSpy = vi.spyOn(testClass, 'originalMethod');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('when store has no data (initial state)', () => {
    it('should call the original method (no status and not loading)', () => {
      testClass.cachedMethod('test');

      expect(originalMethodSpy).toHaveBeenCalledWith('test');
    });

    it('should return the result from the original method', () => {
      const result = testClass.cachedMethod('test');

      expect(result).toBe('test processed');
    });
  });

  describe('when store has state with undefined status and not loading', () => {
    beforeEach(() => {
      store.update(TestStoreEnum.TEST_KEY, {
        data: 'some data',
        status: undefined as any,
        isLoading: false,
        errors: undefined,
      });
    });

    it('should call the original method (status undefined and not loading)', () => {
      testClass.cachedMethod('test');

      expect(originalMethodSpy).toHaveBeenCalledWith('test');
    });
  });

  describe('edge cases with different data states', () => {
    describe('when store has undefined status, undefined data, and not loading', () => {
      beforeEach(() => {
        store.update(TestStoreEnum.TEST_KEY, {
          data: undefined,
          status: undefined as any,
          isLoading: false,
          errors: undefined,
        });
      });

      it('should call the original method (no valid cache conditions)', () => {
        testClass.cachedMethod('test');

        expect(originalMethodSpy).toHaveBeenCalledWith('test');
      });
    });
  });

  describe('fallback scenarios', () => {
    describe('when store is not available on the instance', () => {
      beforeEach(() => {
        testClass = new TestClass(undefined as any);
        originalMethodSpy = vi.spyOn(testClass, 'originalMethod');
      });

      it('should call the original method (fallback behavior)', () => {
        testClass.cachedMethod('test');
        expect(originalMethodSpy).toHaveBeenCalledWith('test');
      });
    });

    describe('when store signal is not found for the key', () => {
      beforeEach(() => {
        vi.spyOn(store, 'get').mockReturnValue(undefined as any);
        originalMethodSpy = vi.spyOn(testClass, 'originalMethod');
      });

      it('should call the original method (fallback behavior)', () => {
        testClass.cachedMethod('test');

        expect(originalMethodSpy).toHaveBeenCalledWith('test');
      });
    });

    describe('when currentState is null or undefined', () => {
      beforeEach(() => {
        const mockSignal = vi.fn().mockReturnValue(null) as any;
        vi.spyOn(store, 'get').mockReturnValue(mockSignal);
        originalMethodSpy = vi.spyOn(testClass, 'originalMethod');
      });

      it('should call the original method (no valid state)', () => {
        testClass.cachedMethod('test');

        expect(originalMethodSpy).toHaveBeenCalledWith('test');
      });
    });
  });

  describe('comprehensive caching logic tests', () => {
    describe('should execute method (no cache) when', () => {
      const testCases = [
        {
          name: 'status is undefined and isLoading is false',
          state: {
            data: undefined,
            status: undefined,
            isLoading: false,
            errors: undefined,
          },
        },
        {
          name: 'status is undefined and isLoading is undefined',
          state: {
            data: undefined,
            status: undefined,
            isLoading: undefined,
            errors: undefined,
          },
        },
        {
          name: 'initial state (no updates made)',
          state: null, // Will use initial store state
        },
      ];

      testCases.forEach(({ name, state }) => {
        it(`${name}`, () => {
          if (state) {
            store.update(TestStoreEnum.TEST_KEY, state as any);
          }
          // If state is null, we use the initial store state

          testClass.cachedMethod('test');

          expect(originalMethodSpy).toHaveBeenCalledWith('test');
        });
      });
    });
  });

  describe('with timeout functionality', () => {
    let timeoutTestClass: TimeoutTestClass;
    let timeoutMethodSpy: MockInstance;
    let dateNowSpy: MockInstance;
    let mockNow: number;

    beforeEach(() => {
      vi.useFakeTimers();
      timeoutTestClass = new TimeoutTestClass(store);
      timeoutMethodSpy = vi.spyOn(timeoutTestClass, 'originalMethod');
      mockNow = 1000000;
      dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(mockNow);
    });

    afterEach(() => {
      vi.useRealTimers();
      dateNowSpy.mockRestore();
      vi.clearAllMocks();
    });

    it('should use cache when timeout has not been exceeded', () => {
      store.update(TestStoreEnum.TEST_KEY, {
        data: 'cached data',
        status: 'Success',
        isLoading: false,
        errors: undefined,
      });

      timeoutTestClass.cachedMethodWithTimeout('test');
      expect(timeoutMethodSpy).toHaveBeenCalledWith('test');
      vi.runAllTimers();

      timeoutMethodSpy.mockClear();
      timeoutTestClass.cachedMethodWithTimeout('test');
      expect(timeoutMethodSpy).not.toHaveBeenCalled();
    });

    it('should clear cache and execute method when timeout has been exceeded', () => {
      store.update(TestStoreEnum.TEST_KEY, {
        data: 'cached data',
        status: 'Success',
        isLoading: false,
        errors: undefined,
      });

      timeoutTestClass.cachedMethodWithTimeout('test');
      expect(timeoutMethodSpy).toHaveBeenCalledWith('test');
      vi.runAllTimers();

      timeoutMethodSpy.mockClear();
      dateNowSpy.mockReturnValue(mockNow + 10001);

      timeoutTestClass.cachedMethodWithTimeout('test');
      expect(timeoutMethodSpy).toHaveBeenCalledWith('test');
    });

    it('should record timestamp when cache is first set', () => {
      store.update(TestStoreEnum.TEST_KEY, {
        data: 'cached data',
        status: 'Success',
        isLoading: false,
        errors: undefined,
      });

      timeoutTestClass.cachedMethodWithTimeout('test');
      expect(timeoutMethodSpy).toHaveBeenCalledWith('test');
      vi.runAllTimers();

      timeoutMethodSpy.mockClear();
      dateNowSpy.mockReturnValue(mockNow + 5000);

      timeoutTestClass.cachedMethodWithTimeout('test');
      expect(timeoutMethodSpy).not.toHaveBeenCalled();
    });

    it('should clear timestamp when cache status is not Success', () => {
      store.update(TestStoreEnum.TEST_KEY, {
        data: 'cached data',
        status: 'Success',
        isLoading: false,
        errors: undefined,
      });

      timeoutTestClass.cachedMethodWithTimeout('test');
      vi.runAllTimers();

      store.update(TestStoreEnum.TEST_KEY, {
        data: undefined,
        status: undefined,
        isLoading: false,
        errors: undefined,
      });

      timeoutTestClass.cachedMethodWithTimeout('test');
      expect(timeoutMethodSpy).toHaveBeenCalledWith('test');
    });

    it('should work without timeout parameter (backward compatibility)', () => {
      store.update(TestStoreEnum.TEST_KEY, {
        data: 'cached data',
        status: 'Success',
        isLoading: false,
        errors: undefined,
      });

      timeoutTestClass.cachedMethodWithoutTimeout('test');
      expect(timeoutMethodSpy).toHaveBeenCalledWith('test');
      vi.runAllTimers();

      timeoutMethodSpy.mockClear();
      timeoutTestClass.cachedMethodWithoutTimeout('test');
      expect(timeoutMethodSpy).not.toHaveBeenCalled();
    });

    it('should never expire when CACHE_NO_TIMEOUT is used', () => {
      store.update(TestStoreEnum.TEST_KEY, {
        data: 'cached data',
        status: 'Success',
        isLoading: false,
        errors: undefined,
      });

      timeoutTestClass.cachedMethodNeverExpire('test');
      expect(timeoutMethodSpy).toHaveBeenCalledWith('test');
      vi.runAllTimers();

      timeoutMethodSpy.mockClear();
      dateNowSpy.mockReturnValue(mockNow + 100000000);

      timeoutTestClass.cachedMethodNeverExpire('test');
      expect(timeoutMethodSpy).not.toHaveBeenCalled();
    });
  });
});

// Test class with decorated methods
class TestClass {
  constructor(public store: BaseStore<typeof TestStoreEnum, TestStoreState>) {}

  @AppCache(TestStoreEnum.TEST_KEY, (instance) => instance.store)
  cachedMethod(input: string): string {
    return this.originalMethod(input);
  }

  originalMethod(input: string): string {
    return `${input} processed`;
  }

  @AppCache(TestStoreEnum.ANOTHER_KEY, (instance) => instance.store)
  anotherCachedMethod(input: number): number {
    return this.anotherOriginalMethod(input);
  }

  anotherOriginalMethod(input: number): number {
    return input * 2;
  }

  @AppCache(TestStoreEnum.TEST_KEY, (instance) => instance.store)
  async cachedAsyncMethod(input: string): Promise<string> {
    return this.originalAsyncMethod(input);
  }

  async originalAsyncMethod(input: string): Promise<string> {
    return `${input} processed`;
  }

  @AppCache(TestStoreEnum.TEST_KEY, (instance) => instance.store)
  cachedMultiParamMethod(arg1: string, arg2: number, arg3: object): string {
    return this.originalMultiParamMethod(arg1, arg2, arg3);
  }

  originalMultiParamMethod(arg1: string, arg2: number, arg3: object): string {
    return `${arg1} ${arg2} ${JSON.stringify(arg3)} processed`;
  }
}

class TimeoutTestClass {
  constructor(public store: BaseStore<typeof TestStoreEnum, TestStoreState>) {}

  @AppCache(TestStoreEnum.TEST_KEY, (instance) => instance.store, false, 10000)
  cachedMethodWithTimeout(input: string): string {
    return this.originalMethod(input);
  }

  @AppCache(TestStoreEnum.TEST_KEY, (instance) => instance.store)
  cachedMethodWithoutTimeout(input: string): string {
    return this.originalMethod(input);
  }

  @AppCache(TestStoreEnum.TEST_KEY, (instance) => instance.store, false, CACHE_NO_TIMEOUT)
  cachedMethodNeverExpire(input: string): string {
    return this.originalMethod(input);
  }

  originalMethod(input: string): string {
    return `${input} processed`;
  }
}
