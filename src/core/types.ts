/**
 * ゲーム状態の型定義の骨格。
 * 詳細は docs/GAME_DESIGN.md を正とする。フェーズ進行に合わせて拡張していく。
 * このファイルは純粋な型定義のみ。ロジックは置かない。
 */

/** 職業ID（GAME_DESIGN.md セクション2） */
export type JobId = 'jobless' | 'swordsman' | 'thief' | 'mage' | 'paladin';

/** キャラクターの基本ステータス */
export interface Stats {
  maxHp: number;
  hp: number;
  strength: number;
  agility: number;
  magic: number;
  luck: number;
}

/** 1人の冒険者（1つの人生）の状態 */
export interface Character {
  jobId: JobId;
  stats: Stats;
  ageYears: number;
  gold: number;
}

/** 人生レイヤーの進行状態（1プレイぶん） */
export interface LifeState {
  character: Character;
  /** この人生で経過した日数 */
  daysElapsed: number;
  /** 現在いる場所。フェーズ2でダンジョン深度などを追加する */
  location: 'town';
  /** 乱数生成器の内部状態（セーブ・復元用） */
  rngState: number;
}

/** メタレイヤー（周回で引き継ぐ）状態。魂・アンロック・統計 */
export interface MetaState {
  souls: number;
  unlockedJobs: JobId[];
  /** 累計統計（死亡数など）。フェーズ3以降で拡張 */
  totalDeaths: number;
}

/** プレイヤーの意思決定。フェーズ進行に合わせて union を拡張する */
export type GameAction = { type: 'debug/tap'; choiceId: string };

/** プレイヤーに見せるログ1行 */
export interface LogEntry {
  id: number;
  text: string;
}

/** 画面に出す選択肢（最大8つ） */
export interface Choice {
  id: string;
  label: string;
  disabled?: boolean;
}

/**
 * すべてのゲーム進行の基本形: applyAction(state, action) => { state, logs }
 * の戻り値。純粋関数として実装する（CLAUDE.md アーキテクチャ原則2）。
 */
export interface ActionResult {
  state: LifeState;
  logs: string[];
}
