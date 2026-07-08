/**
 * ゲーム状態の型定義。詳細は docs/GAME_DESIGN.md を正とする。
 * このファイルは純粋な型定義のみ。ロジックは置かない。
 */

/** 職業ID（GAME_DESIGN.md セクション2） */
export type JobId = 'jobless' | 'swordsman' | 'thief' | 'mage' | 'paladin';

/** アイテムID。マスターデータは src/data/items.ts */
export type ItemId = 'herb' | 'potion' | 'returnScroll';

/** 敵ID。マスターデータは src/data/enemies.ts */
export type EnemyId = 'slime' | 'giantRat' | 'goblin' | 'skeleton' | 'orc';

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
  /**
   * 年齢。行動の対価（年齢コスト）として小数で増えていく
   * （GAME_DESIGN.md セクション3）。小数2桁で保持する。
   */
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
export type SceneId =
  | 'town'
  | 'tavern'
  | 'itemShop'
  | 'work'
  | 'church'
  | 'guild'
  | 'dungeon'
  | 'camp'
  | 'combat'
  | 'retreat'
  | 'death';

/** 人生の終わり方。テキストの出し分けと統計に使う（retired は引退＝死ではない） */
export type DeathCause = 'oldAge' | 'battle' | 'trap' | 'poison' | 'retired';

/** ダンジョンのノード内容（GAME_DESIGN.md セクション5） */
export type DungeonNodeKind = 'entrance' | 'empty' | 'enemy' | 'chest' | 'fountain' | 'camp';

/**
 * フロアグラフの1ノード。プレイヤーにはグラフ全体を見せず、
 * 現在ノードの edges（次のノードID）だけを選択肢として提示する。
 */
export interface DungeonNode {
  id: number;
  /** 段（0=入場地点、最終段=野営地）。エッジは必ず次の段へ向かう */
  row: number;
  kind: DungeonNodeKind;
  /** 選択肢ボタンに出す気配テキスト（確定情報ではない） */
  hint: string;
  /** 進行先ノードのID（最大3つ） */
  edges: number[];
}

/** ダンジョン探索の進行状態 */
export interface DungeonState {
  depth: number;
  /** 現在のフロアのグラフ（プレイヤーには非表示） */
  nodes: DungeonNode[];
  currentNodeId: number;
  /** 現在ノードで未解決のイベント（宝箱・泉の「開ける/飲む」待ち） */
  pendingEvent?: 'chest' | 'fountain';
  /** 歩いて帰還中の残りフロア数（scene が 'retreat' のとき有効） */
  retreatFloorsLeft?: number;
}

/** 深度スケール適用済みの敵1体（戦闘中の状態） */
export interface EnemyInstance {
  defId: EnemyId;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  agility: number;
  goldMin: number;
  goldMax: number;
}

/** 戦闘の進行状態 */
export interface CombatState {
  enemy: EnemyInstance;
  /** 表示中のコマンドメニュー */
  menu: 'main' | 'items';
  /** 勝利・逃走後にどこへ戻るか（ノード探索中 or 帰還中） */
  context: 'node' | 'retreat';
}

/** 人生レイヤーの進行状態（1プレイぶん） */
export interface LifeState {
  character: Character;
  /** 寿命（この年齢に達すると老衰死）。プレイヤーには見せない */
  lifespanYears: number;
  scene: SceneId;
  alive: boolean;
  deathCause?: DeathCause;
  /** この人生で倒した敵の数（魂精算に使う） */
  kills: number;
  /** この人生で到達した最大深度（魂精算・レガシーに使う） */
  maxDepth: number;
  /** 引退の確認待ち（教会・ギルドで「引退を申し出る」を押した状態） */
  retireConfirm?: boolean;
  /** 人生終了時の魂精算の結果（applyAction が自動で設定する） */
  settlement?: { tier: number; souls: number };
  /** ダンジョン内にいる間だけ存在する */
  dungeon?: DungeonState;
  /** 戦闘中だけ存在する */
  combat?: CombatState;
}

/** キャラ作成フローの状態（年齢は固定なのでステップは2つ） */
export interface CreationState {
  step: 'stats' | 'job';
  stats?: Stats;
  rerollCount: number;
}

/** メタレイヤー（周回で引き継ぐ）状態。人生セーブとは別領域に永続保存する */
export interface MetaState {
  souls: number;
  unlockedJobs: JobId[];
  /** 解放済みレガシーのID（src/data/legacies.ts） */
  unlockedLegacies: string[];
  /** 累計死亡数（引退は含まない） */
  totalDeaths: number;
  /** 累計撃破数 */
  totalKills: number;
  /** 全人生を通した最高到達深度 */
  bestDepth: number;
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
  | { type: 'creation/chooseJob'; jobId: JobId }
  | { type: 'town/go'; dest: TownDest }
  | { type: 'tavern/rumor' }
  | { type: 'work/labor'; years: number }
  | { type: 'shop/buy'; itemId: ItemId }
  | { type: 'scene/backToTown' }
  | { type: 'death/reincarnate' }
  // --- ダンジョン ---
  | { type: 'dungeon/advance'; nodeId: number }
  | { type: 'dungeon/chest'; open: boolean }
  | { type: 'dungeon/fountain'; drink: boolean }
  | { type: 'dungeon/useItem'; itemId: ItemId }
  | { type: 'dungeon/retreat' }
  | { type: 'retreat/step' }
  | { type: 'camp/sleep' }
  | { type: 'camp/rest' }
  // --- 戦闘 ---
  | { type: 'combat/attack' }
  | { type: 'combat/skill' }
  | { type: 'combat/itemsOpen' }
  | { type: 'combat/itemsClose' }
  | { type: 'combat/useItem'; itemId: ItemId }
  | { type: 'combat/flee' }
  // --- 引退（教会・ギルド） ---
  | { type: 'retire/ask' }
  | { type: 'retire/confirm' }
  | { type: 'retire/cancel' };

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
