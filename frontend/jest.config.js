const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^lucide-react$': '<rootDir>/node_modules/lucide-react/dist/cjs/lucide-react.js',
    "^@/components/(.)$": "<rootDir>/src/components/$1",
    "^@/hooks/(.)$": "<rootDir>/src/hooks/$1",
    "^@/ui/(.)$": "<rootDir>/src/components/ui/$1",
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest', 
  },
  transformIgnorePatterns: ['/node_modules/(?!lucide-react)/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};

module.exports = createJestConfig(customJestConfig);