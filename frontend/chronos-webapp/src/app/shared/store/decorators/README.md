# Store Decorators

This directory contains decorators for enhancing facade methods with store-related functionality.

## Available Decorators

### @AutoStartLoading

Automatically sets the loading state in the store when a method is called.

**Usage:**
```typescript
@AutoStartLoading(StoreEnum.DATA)
loadData() {
  // Method implementation
}
```

### @Cache

Bypasses method execution if valid data already exists in the store.

**Usage:**
```typescript
@Cache(StoreEnum.DATA)
@AutoStartLoading(StoreEnum.DATA)
loadData() {
  // This will only execute if no valid data exists in the store
}
```

## Cache Decorator Details

### Purpose

The `@Cache` decorator is designed to optimize facade methods by preventing unnecessary API calls when data is already available in the store. This is particularly useful for:

- Reference data that doesn't change frequently
- User settings and preferences
- Data that's expensive to fetch
- Reducing redundant network requests

### How It Works

The decorator checks the store state before executing the original method:

1. **Retrieves current state** from the store using the provided store key
2. **Validates cache** by checking if:
   - `status === 'Success'`
   - `data !== undefined`
   - `data !== null`
3. **Skips execution** if valid cache exists
4. **Proceeds normally** if no valid cache is found

### Cache Conditions

| Condition | Behavior | Reason |
|-----------|----------|---------|
| `status === 'Success' && data !== undefined && data !== null` | ✅ **Skip execution** | Valid cached data exists |
| `status === undefined` | ⚠️ **Execute method** | Initial state, no data loaded |
| `status === 'Error'` | ⚠️ **Execute method** | Previous call failed, retry allowed |
| `data === undefined` | ⚠️ **Execute method** | No data available |
| `data === null` | ⚠️ **Execute method** | Explicit null indicates no data |
| Store/signal not found | ⚠️ **Execute method** | Fallback to original behavior |

### Best Practices

#### ✅ Good Use Cases

```typescript
// Reference data that rarely changes
@Cache(StoreEnum.COUNTRIES)
@AutoStartLoading(StoreEnum.COUNTRIES)
loadCountries() {
  // Perfect for caching - countries don't change often
}

// User settings
@Cache(StoreEnum.USER_PREFERENCES)
@AutoStartLoading(StoreEnum.USER_PREFERENCES)
loadUserPreferences() {
  // Great for caching - settings are accessed frequently
}

// Application configuration
@Cache(StoreEnum.APP_CONFIG)
@AutoStartLoading(StoreEnum.APP_CONFIG)
loadApplicationConfig() {
  // Ideal for caching - config is static during session
}
```

#### ⚠️ Use With Caution

```typescript
// Real-time data
@Cache(StoreEnum.LIVE_PRICES)
loadLivePrices() {
  // Be careful - prices change frequently
  // Consider cache invalidation strategies
}

// User-specific data with parameters
@Cache(StoreEnum.USER_ORDERS)
loadUserOrders(userId: string) {
  // Cache doesn't consider parameters
  // May return wrong user's data
}
```

#### ❌ Avoid For

- Real-time data that changes frequently
- Methods with parameters that affect the result
- Data that must always be fresh
- Operations with side effects beyond data loading

### Forcing Cache Refresh

When you need to bypass the cache and force a fresh load:

```typescript
// Method 1: Clear store before loading
forceRefreshData() {
  this.store.clear(StoreEnum.DATA);
  this.loadData(); // Will execute because cache is cleared
}

// Method 2: Create a separate non-cached method
@AutoStartLoading(StoreEnum.DATA)
refreshData() {
  // No @Cache decorator - always executes
  this.dataUseCase
    .getData()
    .pipe(handleStoreLoading(this.store, StoreEnum.DATA))
    .subscribe();
}
```

### Decorator Order

Always place `@Cache` before `@AutoStartLoading`:

```typescript
// ✅ Correct order
@Cache(StoreEnum.DATA)
@AutoStartLoading(StoreEnum.DATA)
loadData() {
  // Cache check happens first, then loading state is set if needed
}

// ❌ Wrong order
@AutoStartLoading(StoreEnum.DATA)
@Cache(StoreEnum.DATA)
loadData() {
  // Loading state is set even if cache hit occurs
}
```

### Error Handling

The decorator includes built-in error handling:

- **Missing store**: Logs warning and proceeds with original method
- **Missing signal**: Logs warning and proceeds with original method
- **Invalid state**: Gracefully falls back to original behavior

### Performance Considerations

- **Minimal overhead**: Cache check is very fast (simple property access)
- **Memory efficient**: No additional data storage, uses existing store
- **Network savings**: Prevents redundant API calls
- **User experience**: Faster perceived performance for cached data

## Testing

Both decorators include comprehensive test suites covering:

- Normal operation scenarios
- Edge cases and error conditions
- Integration with store systems
- Async method compatibility
- Parameter preservation

Run tests with:
```bash
npm test -- src/app/core/shared/store/decorators/
```
