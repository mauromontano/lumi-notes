/* global jest */
// Mock oficial de AsyncStorage para tests (jest-expo no lo provee).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
