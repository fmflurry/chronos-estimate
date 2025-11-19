import { AutoStartLoading } from './auto-start-loading.decorator';
import { BaseStore } from '../base.store';
import { ResourceState } from '../resource-state.model';
import { vi } from 'vitest';

enum TestStoreEnum {
  TEST_KEY = 'TEST_KEY',
  ANOTHER_KEY = 'ANOTHER_KEY',
}

interface TestStoreState {
  [TestStoreEnum.TEST_KEY]: ResourceState<string>;
  [TestStoreEnum.ANOTHER_KEY]: ResourceState<number>;
}

describe('AutoStartLoading Decorator', () => {
  let store: BaseStore<typeof TestStoreEnum, TestStoreState>;
  let testClass: TestClass;

  beforeEach(() => {
    // Create a mock store
    store = new (class extends BaseStore<typeof TestStoreEnum, TestStoreState> {
      constructor() {
        super(TestStoreEnum);
      }
    })();

    // Spy on the startLoading method
    vi.spyOn(store, 'startLoading');

    // Create an instance of the test class with the mock store
    testClass = new TestClass(store);
  });

  it('should call store.startLoading with the correct key before executing the method', () => {
    // Call the decorated method
    const result = testClass.decoratedMethod('test');

    // Verify that startLoading was called with the correct key
    expect(store.startLoading).toHaveBeenCalledWith(TestStoreEnum.TEST_KEY);

    // Verify that the original method was called and returned the expected result
    expect(result).toBe('test processed');
  });

  it('should work with methods that return promises', async () => {
    // Call the decorated async method
    const promise = testClass.decoratedAsyncMethod('async test');

    // Verify that startLoading was called with the correct key
    expect(store.startLoading).toHaveBeenCalledWith(TestStoreEnum.TEST_KEY);

    // Verify that the promise resolves to the expected value
    const result = await promise;
    expect(result).toBe('async test processed');
  });

  it('should work with methods that return observables', () => {
    // Call the decorated observable method
    const observable = testClass.decoratedObservableMethod('observable test');

    // Verify that startLoading was called with the correct key
    expect(store.startLoading).toHaveBeenCalledWith(TestStoreEnum.ANOTHER_KEY);

    // Verify that the observable emits the expected value
    return new Promise<void>((resolve, reject) => {
      observable.subscribe({
        next: (result) => {
          try {
            expect(result).toBe('observable test processed');
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        error: (err) => {
          reject(err);
        },
      });
    });
  });

  it('should preserve the original method context (this)', () => {
    // Call the method that uses 'this'
    const result = testClass.methodUsingThis('context test');

    // Verify that startLoading was called with the correct key
    expect(store.startLoading).toHaveBeenCalledWith(TestStoreEnum.TEST_KEY);

    // Verify that the method had access to the class property
    expect(result).toBe('context test processed with prefix');
  });

  it('should handle methods with multiple arguments', () => {
    // Call the method with multiple arguments
    const result = testClass.methodWithMultipleArgs('arg1', 42, {
      key: 'value',
    });

    // Verify that startLoading was called with the correct key
    expect(store.startLoading).toHaveBeenCalledWith(TestStoreEnum.TEST_KEY);

    // Verify that all arguments were passed to the original method
    expect(result).toBe('arg1 42 {"key":"value"} processed');
  });
});

// Test class with decorated methods
class TestClass {
  private readonly prefix = 'prefix';

  constructor(public store: BaseStore<typeof TestStoreEnum, TestStoreState>) {}

  @AutoStartLoading(TestStoreEnum.TEST_KEY)
  decoratedMethod(input: string): string {
    return `${input} processed`;
  }

  @AutoStartLoading(TestStoreEnum.TEST_KEY)
  async decoratedAsyncMethod(input: string): Promise<string> {
    return `${input} processed`;
  }

  @AutoStartLoading(TestStoreEnum.ANOTHER_KEY)
  decoratedObservableMethod(input: string) {
    return {
      subscribe: (observer: {
        next: (value: any) => void;
        error?: (error: any) => void;
        complete?: () => void;
      }) => {
        observer.next(`${input} processed`);
        if (observer.complete) {
          observer.complete();
        }
        return { unsubscribe: () => {} };
      },
    };
  }

  @AutoStartLoading(TestStoreEnum.TEST_KEY)
  methodUsingThis(input: string): string {
    return `${input} processed with ${this.prefix}`;
  }

  @AutoStartLoading(TestStoreEnum.TEST_KEY)
  methodWithMultipleArgs(arg1: string, arg2: number, arg3: object): string {
    return `${arg1} ${arg2} ${JSON.stringify(arg3)} processed`;
  }
}
