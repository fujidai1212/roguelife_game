import type { ItemId } from '../core/types';

/**
 * レガシー（来世への恩恵）のマスターデータ（GAME_DESIGN.md セクション7）。
 * 条件はメタ統計（MetaState）に対して判定し、一度解放されると全ての来世に適用される。
 * 追加はここに追記するだけで済むようにする（CLAUDE.md アーキテクチャ原則3）。
 * フェーズ5でシミュレーション（npm run simulate）に基づいて調整済み。
 * ステータス補正レガシーは周回の成長軸なので、増やすときは難易度への影響を検証すること。
 */

/** 解放条件（メタ統計に対する下限） */
export type LegacyCondition =
  | { kind: 'bestDepth'; value: number }
  | { kind: 'totalDeaths'; value: number }
  | { kind: 'totalKills'; value: number }
  | { kind: 'totalMidBossKills'; value: number }
  | { kind: 'totalBossKills'; value: number };

/** ステータスへの永続補正（職業補正と同じ形。指定しない項目は0） */
export interface LegacyStatBonus {
  maxHp?: number;
  strength?: number;
  agility?: number;
  magic?: number;
  luck?: number;
}

/** 来世への効果 */
export type LegacyEffect =
  | { kind: 'shopDiscount'; percent: number }
  | { kind: 'startingItem'; itemId: ItemId; count: number }
  | { kind: 'startingGold'; amount: number }
  | { kind: 'statBonus'; stats: LegacyStatBonus };

export interface LegacyDef {
  id: string;
  name: string;
  description: string;
  condition: LegacyCondition;
  effect: LegacyEffect;
}

export const legacies: LegacyDef[] = [
  {
    id: 'depth5',
    name: '深みを知る者',
    description: 'ダンジョン深度5に到達した。道具屋の親父が一目置き、価格が10%引きになる。',
    condition: { kind: 'bestDepth', value: 5 },
    effect: { kind: 'shopDiscount', percent: 10 },
  },
  {
    id: 'deaths3',
    name: '死に慣れた魂',
    description: '3度死んだ。次からの人生は、薬草2つを懐に入れて始まる。',
    condition: { kind: 'totalDeaths', value: 3 },
    effect: { kind: 'startingItem', itemId: 'herb', count: 2 },
  },
  {
    id: 'kills30',
    name: '返り血の褒賞',
    description: '累計30体を屠った。どこかの誰かが、来世の財布に30Gを足してくれる。',
    condition: { kind: 'totalKills', value: 30 },
    effect: { kind: 'startingGold', amount: 30 },
  },
  {
    id: 'depth4hp',
    name: '肉体の記憶',
    description: '深度4の空気を吸った魂は、来世の肉体を頑健にする。（最大HP+10）',
    condition: { kind: 'bestDepth', value: 4 },
    effect: { kind: 'statBonus', stats: { maxHp: 10 } },
  },
  {
    id: 'depth8hp',
    name: '深淵の耐性',
    description: '深度8の瘴気に耐えた魂は、来世の肉体をさらに強くする。（最大HP+15）',
    condition: { kind: 'bestDepth', value: 8 },
    effect: { kind: 'statBonus', stats: { maxHp: 15 } },
  },
  {
    id: 'midBoss1',
    name: '主殺し',
    description:
      'ダンジョンの主を初めて討った。その武勇は語り継がれ、来世の財布に100Gが積まれる。',
    condition: { kind: 'totalMidBossKills', value: 1 },
    effect: { kind: 'startingGold', amount: 100 },
  },
  {
    id: 'midBoss3',
    name: '主喰らい',
    description: 'ダンジョンの主を3体討った。主の力の一端が、来世の腕に宿る。（力+3）',
    condition: { kind: 'totalMidBossKills', value: 3 },
    effect: { kind: 'statBonus', stats: { strength: 3 } },
  },
  {
    id: 'boss1',
    name: '英雄の血脈',
    description:
      '最深部のあれを討ち果たした。英雄の血を引く来世は、ポーション3つを携えて生まれる。',
    condition: { kind: 'totalBossKills', value: 1 },
    effect: { kind: 'startingItem', itemId: 'potion', count: 3 },
  },
];
