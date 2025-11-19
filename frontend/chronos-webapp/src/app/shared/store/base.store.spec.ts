/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BaseStore } from './base.store';
import { ResourceState } from './resource-state.model';

/**
 * Test enum for the store
 */
enum TestStoreEnum {
  ITEM_ONE = 'ITEM_ONE',
  ITEM_TWO = 'ITEM_TWO',
  ITEM_THREE = 'ITEM_THREE',
}

/**
 * Test data interface that extends ResourceState
 */
interface TestData {
  [TestStoreEnum.ITEM_ONE]: ResourceState<string>;
  [TestStoreEnum.ITEM_TWO]: ResourceState<number>;
  [TestStoreEnum.ITEM_THREE]: ResourceState<{ id: string; name: string }>;
}

/**
 * Concrete implementation of BaseStore for testing
 */
@Injectable()
class TestStore extends BaseStore<typeof TestStoreEnum, TestData> {
  constructor() {
    super(TestStoreEnum);
  }
}

describe('BaseStore', () => {
  let store: TestStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TestStore],
    });
    store = TestBed.inject(TestStore);
  });

  it('should create the store', () => {
    expect(store).toBeTruthy();
  });

  describe('constructor and initialization', () => {
    it('should initialize state with default values for all enum keys', () => {
      // Check that all enum keys have been initialized with default values
      Object.values(TestStoreEnum).forEach((key) => {
        const signal = store.get(key);
        expect(signal).toBeDefined();
        const state = signal();
        expect(state.isLoading).toBe(false);
        expect(state.data).toBeUndefined();
      });
    });
  });

  describe('get method', () => {
    it('should return the signal for a valid key', () => {
      const signal = store.get(TestStoreEnum.ITEM_ONE);
      expect(signal).toBeDefined();
      const state = signal();
      expect(state.isLoading).toBe(false);
      expect(state.data).toBeUndefined();
    });

    it('should return a writable signal that can be updated directly', () => {
      const signal = store.get(TestStoreEnum.ITEM_ONE);
      expect(signal).toBeDefined();

      // Update the signal directly
      signal.set({
        data: 'test value',
        isLoading: false,
        status: 'Success',
        errors: undefined,
      });

      // Check that the value was updated
      expect(signal()).toEqual({
        data: 'test value',
        isLoading: false,
        status: 'Success',
      });
    });

    it('should return undefined for an invalid key', () => {
      // @ts-ignore - Testing invalid key scenario
      const signal = store.get('NON_EXISTENT_KEY');
      expect(signal).toBeUndefined();
    });

    it('should maintain type safety for different resource types', () => {
      // Update with type-specific data
      store.update(TestStoreEnum.ITEM_ONE, {
        data: 'string data',
        status: 'Success',
      });
      store.update(TestStoreEnum.ITEM_TWO, { data: 42, status: 'Success' });
      store.update(TestStoreEnum.ITEM_THREE, {
        data: { id: '123', name: 'Test Object' },
        status: 'Success',
      });

      // Get signals and check their types
      const stringSignal = store.get(TestStoreEnum.ITEM_ONE);
      const numberSignal = store.get(TestStoreEnum.ITEM_TWO);
      const objectSignal = store.get(TestStoreEnum.ITEM_THREE);

      expect(stringSignal).toBeDefined();
      expect(numberSignal).toBeDefined();
      expect(objectSignal).toBeDefined();

      expect(typeof stringSignal().data).toBe('string');
      expect(typeof numberSignal().data).toBe('number');
      expect(typeof objectSignal().data).toBe('object');
      expect(objectSignal().data?.id).toBe('123');
    });
  });

  describe('update method', () => {
    it('should update the state for a valid key', () => {
      // Update the state
      store.update(TestStoreEnum.ITEM_ONE, {
        data: 'updated value',
        status: 'Success',
      });

      // Get the updated signal
      const signal = store.get(TestStoreEnum.ITEM_ONE);
      expect(signal).toBeDefined();

      // Check that the state was updated correctly
      expect(signal()).toEqual({
        data: 'updated value',
        isLoading: false,
        status: 'Success',
      });
    });

    it('should merge the new state with the existing state', () => {
      // First set some initial state
      store.update(TestStoreEnum.ITEM_ONE, {
        data: 'initial value',
        status: 'Success',
        errors: [
          {
            code: 'INITIAL_ERROR',
            message: 'MESSAGE_INITIAL_ERROR',
          },
        ],
      });

      // Then update only part of the state
      store.update(TestStoreEnum.ITEM_ONE, {
        isLoading: true,
        errors: [
          {
            code: 'UPDATED_ERROR',
            message: 'MESSAGE_UPDATED_ERROR',
          },
        ],
      });

      // Get the updated signal
      const signal = store.get(TestStoreEnum.ITEM_ONE);
      expect(signal).toBeDefined();

      // Check that the state was merged correctly
      expect(signal()).toEqual({
        data: 'initial value',
        isLoading: true,
        status: 'Success',
        errors: [
          {
            code: 'UPDATED_ERROR',
            message: 'MESSAGE_UPDATED_ERROR',
          },
        ],
      });
    });

    it('should do nothing for an invalid key', () => {
      // Using a non-existent key should not throw an error
      // @ts-ignore - Testing invalid key scenario
      expect(() => store.update('INVALID_KEY', { data: 'test' })).not.toThrow();
    });

    it('should handle updating with empty objects', () => {
      // First set some initial state
      store.update(TestStoreEnum.ITEM_ONE, {
        data: 'test',
        status: 'Success',
      });

      // Then update with an empty object
      store.update(TestStoreEnum.ITEM_ONE, {});

      // Get the updated signal
      const signal = store.get(TestStoreEnum.ITEM_ONE);
      expect(signal).toBeDefined();

      // Check that the state remains unchanged
      expect(signal()).toEqual({
        data: 'test',
        isLoading: false,
        status: 'Success',
      });
    });

    it('should handle updating with undefined values', () => {
      // First set some initial state
      store.update(TestStoreEnum.ITEM_ONE, {
        data: 'test',
        status: 'Success',
      });

      // Then update with undefined data
      store.update(TestStoreEnum.ITEM_ONE, { data: undefined });

      // Get the updated signal
      const signal = store.get(TestStoreEnum.ITEM_ONE);
      expect(signal).toBeDefined();

      // Check that data was set to undefined
      expect(signal()).toEqual({
        data: undefined,
        isLoading: false,
        status: 'Success',
      });
    });
  });

  describe('startLoading method', () => {
    it('should set isLoading to true for a valid key', () => {
      // Start loading
      store.startLoading(TestStoreEnum.ITEM_ONE);

      // Get the updated signal
      const signal = store.get(TestStoreEnum.ITEM_ONE);
      expect(signal).toBeDefined();

      // Check that isLoading was set to true
      const state = signal();
      expect(state.isLoading).toBe(true);
      expect(state.data).toBeUndefined();
    });

    it('should preserve existing data state when setting isLoading', () => {
      // First set some initial state
      store.update(TestStoreEnum.ITEM_ONE, {
        data: 'test data',
        status: 'Error',
        errors: [
          {
            code: 'ERR_001',
            message: 'MESSAGE_ERR_001',
          },
        ],
      });

      // Then start loading
      store.startLoading(TestStoreEnum.ITEM_ONE);

      // Get the updated signal
      const signal = store.get(TestStoreEnum.ITEM_ONE);
      expect(signal).toBeDefined();

      // Check that isLoading was set to true while preserving data
      expect(signal()).toEqual({
        data: 'test data',
        isLoading: true,
        status: undefined,
        errors: undefined,
      });
    });

    it('should do nothing for an invalid key', () => {
      // Using a non-existent key should not throw an error
      // @ts-ignore - Testing invalid key scenario
      expect(() => store.startLoading('INVALID_KEY')).not.toThrow();
    });

    it('should override isLoading even if it was explicitly set to false', () => {
      // First set isLoading to false explicitly
      store.update(TestStoreEnum.ITEM_ONE, {
        isLoading: false,
        status: 'Success',
      });

      // Then start loading
      store.startLoading(TestStoreEnum.ITEM_ONE);

      // Get the updated signal
      const signal = store.get(TestStoreEnum.ITEM_ONE);
      expect(signal).toBeDefined();

      // Check that isLoading was set to true
      expect(signal().isLoading).toBe(true);
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple updates to the same key', () => {
      // Perform a series of updates
      store.update(TestStoreEnum.ITEM_TWO, { data: 42, status: 'Success' });
      store.startLoading(TestStoreEnum.ITEM_TWO);
      store.update(TestStoreEnum.ITEM_TWO, {
        data: 100,
        errors: [
          {
            code: 'ERR_001',
            message: 'MESSAGE_ERR_001',
          },
        ],
      });
      store.update(TestStoreEnum.ITEM_TWO, { status: 'Error' });

      // Get the final state
      const signal = store.get(TestStoreEnum.ITEM_TWO);
      expect(signal).toBeDefined();

      // Check that all updates were applied correctly
      expect(signal()).toEqual({
        data: 100,
        isLoading: true,
        status: 'Error',
        errors: [
          {
            code: 'ERR_001',
            message: 'MESSAGE_ERR_001',
          },
        ],
      });
    });

    it('should maintain separate state for different keys', () => {
      // Update all keys with different values
      store.update(TestStoreEnum.ITEM_ONE, {
        data: 'string value',
        status: 'Success',
      });

      store.update(TestStoreEnum.ITEM_TWO, {
        data: 123,
        status: 'Error',
        errors: [
          {
            code: 'ERR_001',
            message: 'MESSAGE_ERR_001',
          },
        ],
      });

      store.update(TestStoreEnum.ITEM_THREE, {
        data: { id: 'obj-1', name: 'Test Object' },
        status: 'Success',
        isLoading: true,
      });

      // Get signals for all keys
      const itemOneSignal = store.get(TestStoreEnum.ITEM_ONE);
      const itemTwoSignal = store.get(TestStoreEnum.ITEM_TWO);
      const itemThreeSignal = store.get(TestStoreEnum.ITEM_THREE);

      expect(itemOneSignal).toBeDefined();
      expect(itemTwoSignal).toBeDefined();
      expect(itemThreeSignal).toBeDefined();

      // Check that each key has its own state
      expect(itemOneSignal()).toEqual({
        data: 'string value',
        isLoading: false,
        status: 'Success',
      });

      expect(itemTwoSignal()).toEqual({
        data: 123,
        isLoading: false,
        status: 'Error',
        errors: [
          {
            code: 'ERR_001',
            message: 'MESSAGE_ERR_001',
          },
        ],
      });

      expect(itemThreeSignal()).toEqual({
        data: { id: 'obj-1', name: 'Test Object' },
        isLoading: true,
        status: 'Success',
      });
    });

    it('should handle a complete workflow scenario', () => {
      // 1. Start loading
      store.startLoading(TestStoreEnum.ITEM_THREE);
      const loadingSignal = store.get(TestStoreEnum.ITEM_THREE);
      expect(loadingSignal).toBeDefined();
      expect(loadingSignal().isLoading).toBe(true);

      // 2. Update with success data
      store.update(TestStoreEnum.ITEM_THREE, {
        data: { id: 'obj-2', name: 'Loaded Object' },
        status: 'Success',
        isLoading: false,
      });

      // 3. Check final state
      const finalSignal = store.get(TestStoreEnum.ITEM_THREE);
      expect(finalSignal).toBeDefined();
      const finalState = finalSignal();
      expect(finalState).toEqual({
        data: { id: 'obj-2', name: 'Loaded Object' },
        isLoading: false,
        status: 'Success',
      });
    });

    it('should handle error scenarios', () => {
      // 1. Start loading
      store.startLoading(TestStoreEnum.ITEM_ONE);

      // 2. Update with error
      store.update(TestStoreEnum.ITEM_ONE, {
        status: 'Error',
        errors: [
          {
            code: 'CODE_API_ERROR',
            message: 'MESSAGE_API_ERROR',
          },
        ],
        isLoading: false,
      });

      // 3. Check error state
      const errorSignal = store.get(TestStoreEnum.ITEM_ONE);
      expect(errorSignal).toBeDefined();
      const errorState = errorSignal();
      expect(errorState.isLoading).toBe(false);
      expect(errorState.status).toBe('Error');
      expect(errorState.errors).toBeDefined();
      expect(errorState.errors).toBeDefined();
      if (errorState.errors) {
        expect(errorState.errors[0].code).toStrictEqual('CODE_API_ERROR');
        expect(errorState.errors[0].message).toStrictEqual('MESSAGE_API_ERROR');
      }
      expect(errorState.data).toBeUndefined();
    });
  });
});
