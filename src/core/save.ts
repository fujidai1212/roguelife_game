import type { GameState, LogEntry } from './types';

/**
 * セーブデータのシリアライズ/復元。純粋ロジックのみ。
 * 実際の保存先（AsyncStorage）は src/ui/ 側が担当する。
 */

/** セーブデータの形式バージョン。互換性が壊れる変更をしたら+1する */
// v2: 時間システムを「日数」から「年齢コスト」に変更（GAME_DESIGN.md セクション3）
// v3: ダンジョン・戦闘の状態を追加（フェーズ2）
export const SAVE_VERSION = 3;

export interface SaveData {
  version: number;
  state: GameState;
  /** 再開時に画面へ復元するログ（直近分のみ） */
  logs: LogEntry[];
}

export function serializeSave(state: GameState, logs: LogEntry[]): string {
  const data: SaveData = { version: SAVE_VERSION, state, logs };
  return JSON.stringify(data);
}

/**
 * セーブデータ文字列を復元する。
 * 壊れている・バージョンが合わない場合は null（呼び出し側は新規開始にする）。
 */
export function parseSave(json: string): SaveData | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;

  const data = parsed as Partial<SaveData>;
  if (data.version !== SAVE_VERSION) return null;
  if (typeof data.state !== 'object' || data.state === null) return null;
  if (typeof data.state.rngState !== 'number') return null;
  if (data.state.phase !== 'creation' && data.state.phase !== 'life') return null;
  if (!Array.isArray(data.logs)) return null;

  return { version: SAVE_VERSION, state: data.state, logs: data.logs };
}
