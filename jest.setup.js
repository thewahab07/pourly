// Solver-backed level validation is CPU bound; give those suites room to run.
jest.setTimeout(120_000);

// AsyncStorage has no native module under Jest; its official in-memory mock
// lets the storage service be exercised for real.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
