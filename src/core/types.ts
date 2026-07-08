/**
 * ゲーム状態の型定義。詳細は docs/GAME_DESIGN.md を正とする。
 * このファイルは純粋な型定義のみ。ロジックは置かない。
 */

/** 職業ID（GAME_DESIGN.md セクション2） */
export type JobId = 'jobless' | 'swordsman' | 'thief' | 'mage' | 'paladin';

/** アイテムID。マスターデータは src/data/items.ts */
export type ItemId = 'herb' | 'potion' | 'returnScroll';

/** キャラクターの基本ステータス */
export interface Stats {
  maxHp: number;
  hp: number;
  strength: number;
  agility: number;
  magic: number;
  luck: number;
}

/** 1人の冒険者（1つの人生） */
export interface Character {
  jobId: JobId;
  stats: Stats;
  ageYears: number;
  gold: number;
  items: Partial<Record<ItemId, number>>;
}

/** 町の行き先（GAME_DESIGN.md セクション4） */
export type TownDest =
  | 'guild'
  | 'tavern'
  | 'weaponShop'
  | 'itemShop'
  | 'alley'
  | 'work'
  | 'church'
  | 'dungeon';

/** 現在の場面。UIのイラスト・選択肢はここから決まる */
export type SceneId = 'town' | 'tavern' | 'itemShop' | 'work' | 'death';

/** 人生レイヤーの進行状態（1プレイぶん） */
export interface LifeState {
  character: Character;
  /** この人生で経過した日数 */
  daysElapsed: number;
  /** 加齢カウンタ（daysPerYear に達すると1歳加齢して0に戻る） */
  daysIntoYear: number;
  /** 寿命（この年齢に達すると老衰死）。プレイヤーには見せない */
  lifespanYears: number;
  scene: SceneId;
  alive: boolean;
  deathCause?: 'oldAge';
}

/** キャラ作成フローの状態 */
export interface CreationState {
  step: 'stats' | 'age' | 'job';
  stats?: Stats;
  ageYears?: number;
  rerollCount: number;
}

/** メタレイヤー（周回で引き継ぐ）状態。魂の本実装はフェーズ3 */
export interface MetaState {
  souls: number;
  unlockedJobs: JobId[];
  totalDeaths: number;
}

/** ゲーム全体の状態。これを丸ごとセーブする */
export interface GameState {
  phase: 'creation' | 'life';
  creation?: CreationState;
  life?: LifeState;
  meta: MetaState;
  /** 乱数生成器の内部状態（セーブ・復元用） */
  rngState: number;
}

/** プレイヤーの意思決定。フェーズ進行に合わせて拡張する */
export type GameAction =
  | { type: 'creation/reroll' }
  | { type: 'creation/confirmStats' }
  | { type: 'creation/confirmAge' }
  | { type: 'creation/chooseJob'; jobId: JobId }
  | { type: 'town/go'; dest: TownDest }
  | { type: 'tavern/rumor' }
  | { type: 'work/labor' }
  | { type: 'shop/buy'; itemId: ItemId }
  | { type: 'scene/backToTown' }
  | { type: 'death/reincarnate' };

/**
 * すべてのゲーム進行の基本形: applyAction(state, action) => { state, logs }
 * の戻り値。純粋関数として実装する（CLAUDE.md アーキテクチャ原則2）。
 */
export interface ActionResult {
  state: GameState;
  logs: string[];
}

/** プレイヤーに見せるログ1行（UI用） */
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

/** 選択肢と、それを選んだときに発行するアクションの組 */
export interface ChoiceBinding {
  choice: Choice;
  action: GameAction;
}
