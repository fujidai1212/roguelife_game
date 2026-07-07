const tsPlugin = require('@typescript-eslint/eslint-plugin');
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      // ゲーム状態・アクション・イベントはすべて型定義する（CLAUDE.md: any 禁止）
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
]);
