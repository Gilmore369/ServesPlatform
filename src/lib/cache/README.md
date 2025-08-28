# Intelligent Cache System

This module provides a comprehensive caching solution for the Google Sheets integration with TTL strategies differentiated by data type, SWR integration for client-side caching, and automatic cache invalidation based on write operations.

## Features

- **Server-side caching** with intelligent TTL based on data type
- **Client-side SWR integration** with automatic revalidation
- **Cache invalidation** triggered by write operations
- **Performance monitoring** and statistics
- **LRU/FIFO eviction** strategies
- **Optimistic updates** support

## Quick Start

### Basic Usage with SWR Hooks

```typescript
import { useList, useRecord, CacheMutator } from '@/lib/cache';

// List materials with automatic caching
function MaterialsList() {
  const { data, error, isLoading } = useList('materiales');
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <ul>
      {data?.map(material => (
        <li key={material.id}>{material.name}</li>
      ))}
    </ul>
  );
}

// Single record with caching
function MaterialDetail({ id }: { id: string }) {
  const { data, error, isLoading } = useRecord('materiales', id);
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{data?.name}</div>;
}
```

### Write Operations with Cache Invalidation

```typescript
import { CacheMutator } from '@/lib/cache';

// Create new material
async function createMaterial(data: any) {
  try {
    const response = await CacheMutator.create('materiales', data, {
      revalidateRelated: true // Also revalidate related data
    });
    
    if (response.ok) {
      console.log('Material created:', response.data);
    }
  } catch (error) {
    console.error('Failed to create material:', error);
  }
}

// Update with optimistic updates
async function updateMaterial(id: string, data: any) {
  try {
    const response = await CacheMutator.update('materiales', id, data, {
      optimisticUpdate: true, // Update UI immediately
      revalidateRelated: true
    });
    
    if (response.ok) {
      console.log('Material updated:', response.data);
    }
  } catch (error) {
    console.error('Failed to update material:', error);
    // Optimistic update will be reverted automatically
  }
}
```

### Advanced Usage with Filters and Pagination

```typescript
import { useList } from '@/lib/cache';

function FilteredMaterials() {
  const filters = { categoria: 'Herramientas', activo: true };
  const pagination = { page: 1, limit: 20 };
  
  const { 
    data, 
    error, 
    isLoading,
    cacheKey,
    invalidateCache,
    refreshData 
  } = useList('materiales', filters, pagination, {
    revalidateOnFocus: true,
    refreshInterval: 5 * 60 * 1000 // 5 minutes
  });
  
  const handleRefresh = async () => {
    await refreshData();
  };
  
  const handleInvalidate = async () => {
    await invalidateCache();
  };
  
  return (
    <div>
      <button onClick={handleRefresh}>Refresh</button>
      <button onClick={handleInvalidate}>Clear Cache</button>
      {/* Render data */}
    </div>
  );
}
```

## Configuration

### TTL Configuration by Data Type

The system automatically applies different TTL values based on data type:

```typescript
const TTL_CONFIG = {
  list: 300,        // 5 minutes - Lists change frequently
  record: 600,      // 10 minutes - Individual records
  static: 3600,     // 1 hour - Static/reference data
  user: 1800,       // 30 minutes - User data
  project: 900,     // 15 minutes - Project data
  material: 1200,   // 20 minutes - Material data
  activity: 600,    // 10 minutes - Activity data
  report: 1800      // 30 minutes - Report data
};
```

### Cache Invalidation Patterns

Write operations automatically invalidate related caches:

```typescript
const INVALIDATION_PATTERNS = {
  'proyectos': [
    'proyectos:*',
    'dashboard:*',
    'reports:proyectos:*'
  ],
  'materiales': [
    'materiales:*',
    'dashboard:*',
    'reports:materiales:*'
  ],
  // ... more patterns
};
```

### Custom Cache Configuration

```typescript
import { CacheManager } from '@/lib/cache';

const customCache = new CacheManager({
  maxSize: 5000,
  strategy: 'lru', // or 'fifo'
  ttl: 1800 // default TTL in seconds
});
```

## Cache Statistics and Monitoring

```typescript
import { CacheUtils, cacheManager } from '@/lib/cache';

// Get cache statistics
const stats = CacheUtils.getStats();
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
console.log(`Cache size: ${stats.size}`);

// Get entry information for debugging
const entryInfo = cacheManager.getEntryInfo('materiales:list');
console.log(`Entry age: ${entryInfo.age}s`);
console.log(`Access count: ${entryInfo.accessCount}`);
```

## Cache Management Utilities

```typescript
import { CacheUtils } from '@/lib/cache';

// Clear all caches
await CacheUtils.clearAll();

// Preload data into cache
await CacheUtils.preload({
  table: 'materiales',
  operation: 'list'
});
```

## Best Practices

### 1. Use Appropriate Data Types
The cache system automatically infers data types from cache keys, but you can be explicit:

```typescript
const { data } = useList('materiales', {}, {}, {
  dataType: 'material' // Explicit data type
});
```

### 2. Handle Loading and Error States
Always handle loading and error states in your components:

```typescript
function MyComponent() {
  const { data, error, isLoading } = useList('materiales');
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return <EmptyState />;
  
  return <DataList data={data} />;
}
```

### 3. Use Optimistic Updates for Better UX
For write operations that are likely to succeed:

```typescript
await CacheMutator.update('materiales', id, data, {
  optimisticUpdate: true
});
```

### 4. Invalidate Related Data When Necessary
For operations that affect multiple data types:

```typescript
await CacheMutator.create('proyectos', data, {
  revalidateRelated: true // Will also revalidate activities, dashboard, etc.
});
```

### 5. Monitor Cache Performance
Regularly check cache statistics to optimize performance:

```typescript
// In development or monitoring dashboard
const stats = CacheUtils.getStats();
if (stats.hitRate < 0.7) {
  console.warn('Low cache hit rate, consider adjusting TTL values');
}
```

## Integration with Existing Code

The cache system is designed to work seamlessly with the existing Google Sheets API service. It automatically:

- Caches successful read operations
- Invalidates caches on write operations
- Provides fallback to cached data on network errors
- Integrates with the existing error handling and retry logic

## Performance Considerations

- **Memory Usage**: The cache has a configurable maximum size with LRU eviction
- **Network Requests**: SWR deduplicates requests and provides background revalidation
- **Cache Invalidation**: Selective invalidation minimizes unnecessary cache clearing
- **TTL Strategy**: Different TTL values optimize for data freshness vs. performance

## Troubleshooting

### High Memory Usage
If cache memory usage is high:
1. Reduce `maxSize` in cache configuration
2. Lower TTL values for frequently changing data
3. Use more aggressive eviction strategies

### Low Cache Hit Rate
If cache hit rate is low:
1. Increase TTL values for stable data
2. Check if cache keys are consistent
3. Verify cache invalidation isn't too aggressive

### Stale Data Issues
If data appears stale:
1. Reduce TTL for affected data types
2. Enable `revalidateOnFocus` for critical data
3. Use manual cache invalidation when needed