import { describe, expect, it } from 'vitest';

import { newGame } from '../actions';
import { parseSave, SAVE_VERSION, serializeSave } from '../save';
import type { LogEntry } from '../types';

describe('セーブデータのシリアライズ/復元', () => {
  it('保存して復元すると同じ状態に戻る（ラウンドトリップ）', () => {
    const { state } = newGame(123);
    const logs: LogEntry[] = [{ id: 0, text: 'テストログ' }];
    const restored = parseSave(serializeSave(state, logs));
    expect(restored).not.toBeNull();
    expect(restored!.state).toEqual(state);
    expect(restored!.logs).toEqual(logs);
    expect(restored!.version).toBe(SAVE_VERSION);
  });

  it('壊れたJSONは null になる', () => {
    expect(parseSave('{壊れている')).toBeNull();
    expect(parseSave('')).toBeNull();
    expect(parseSave('null')).toBeNull();
    expect(parseSave('123')).toBeNull();
  });

  it('バージョンが違うセーブは null になる（新規開始に落とす）', () => {
    const { state } = newGame(123);
    const json = serializeSave(state, []).replace(
      `"version":${SAVE_VERSION}`,
      `"version":${SAVE_VERSION + 1}`,
    );
    expect(parseSave(json)).toBeNull();
  });

  it('必須フィールドが欠けたデータは null になる', () => {
    expect(parseSave(JSON.stringify({ version: SAVE_VERSION }))).toBeNull();
    expect(
      parseSave(JSON.stringify({ version: SAVE_VERSION, state: { phase: 'life' }, logs: [] })),
    ).toBeNull();
  });
});
