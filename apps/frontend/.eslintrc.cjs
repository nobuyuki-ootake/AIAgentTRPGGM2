module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: [
    'react',
    'react-hooks',
    '@typescript-eslint',
  ],
  rules: {
    // React関連のルール
    'react/react-in-jsx-scope': 'off', // React 17+では不要
    'react/prop-types': 'off', // TypeScriptを使用するため
    'react/display-name': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // TypeScript関連のルール
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-empty-function': 'warn',
    
    // 一般的なルール
    'no-console': 'off',
    'prefer-const': 'error',
    'no-var': 'error',
    'no-unused-vars': 'off', // TypeScript版を使用
    'no-undef': 'off', // TypeScriptで解決
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  ignorePatterns: [
    'dist/',
    'build/',
    '.next/',
    'node_modules/',
  ],
};