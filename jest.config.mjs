export default {
    collectCoverageFrom: ['src/**/*.{ts,tsx}'],
    testMatch: ['<rootDir>/test/**/*.{ts,tsx}'],
    coverageThreshold: { global: { statements: 100, branches: 100, functions: 100, lines: 100 } },
    coverageDirectory: "<rootDir>/build/coverage",
    testEnvironment: 'jsdom',
};
