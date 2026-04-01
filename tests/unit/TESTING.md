# Creative Code Platform - Unit Tests

## Running Tests

```bash
npm test
```

## Test Organization

Tests are organized by feature:
- `filesystem.test.js` - File system access tests
- `project.test.js` - Project management tests
- `state.test.js` - State management tests

## Writing Tests

Follow Jest best practices:
- Use `describe()` to group related tests
- Use `it()` for individual tests
- Use `expect()` for assertions
- Mock external dependencies

## Example

```javascript
import { get, set } from '../core/state.js';

describe('State Management', () => {
  it('should store and retrieve values', () => {
    set('test', 'value');
    expect(get('test')).toBe('value');
  });
});
```
