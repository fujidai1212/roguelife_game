import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // ユニットテストはゲームロジック（src/core）のみ対象（CLAUDE.md 技術スタック）
    include: ['src/core/**/*.test.ts'],
  },
});
