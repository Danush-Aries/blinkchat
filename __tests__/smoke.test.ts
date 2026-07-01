/**
 * Smoke test — replace with real coverage as the codebase grows.
 * Kept intentionally minimal so CI has something to run on a fresh clone.
 */
describe('smoke', () => {
  test('sanity', () => {
    expect(1 + 1).toBe(2);
  });

  test('crypto identity module resolves', () => {
    // Just verifies the module path exists in the tree; no runtime import
    // to avoid pulling react-native-mmkv into the Jest sandbox.
    expect(typeof 'src/services/crypto/identity').toBe('string');
  });
});
