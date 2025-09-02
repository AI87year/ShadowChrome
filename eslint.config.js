import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**', 'server/node_modules/**', 'server/shadowsocks_config.js']
  },
  {
    ...js.configs.recommended,
    files: ['**/*.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, chrome: 'readonly' },
      sourceType: 'module'
    }
  },
  {
    files: ['server/**'],
    languageOptions: {
      sourceType: 'script'
    }
  }
];
