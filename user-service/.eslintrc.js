// .eslintrc.js
// These rules enforce clean, consistent JavaScript across the service.
// The rules are aligned with what SonarCloud checks, so fixing ESLint
// errors locally means fewer SonarCloud failures in CI.

module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    // Catch bugs
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'no-var': 'error',

    // Clean code
    'prefer-const': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],

    // Security (aligns with SonarCloud rules)
    'no-eval': 'error',
    'no-implied-eval': 'error',
  },
};
