module.exports = {
  globals: {
    'ts-jest': {
      diagnostics: {
        ignoreCodes: [2532],
      },
    },
  },

  // collectCoverage: false,

  // coveragePathIgnorePatterns: ['/node_modules|lib/'],

  // collectCoverageFrom: ['src/**/*.ts'],

  transform: {
    '.(ts|tsx)': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|\\.(test|spec))\\.(ts)$',
  moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'node'],
};
