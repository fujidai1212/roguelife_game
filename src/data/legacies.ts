import type { ItemId } from '../core/types';

/**
 * レガシー（来世への恩恵）のマスターデータ（GAME_DESIGN.md セクション7）。
 * 条件はメタ統計（MetaState）に対して判定し、一度解放されると全ての来世に適用される。
 * 追加はここに追記するだけで済むようにする（CLAUDE.md アーキテクチャ原則3）。
 * TODO: 条件・効果量は仮置き。フェーズ5のバランス調整パスで見直す。
 */

/** 解放条件（メタ統計に対する下限） */
export type LegacyCondition =
  | { kind: 'bestDepth'; value: number }
  | { kind: 'totalDeaths'; value: number }
  | { kind: 'totalKills'; value: number }
  | { kind: 'totalMidBossKills'; value: number }
  | { kind: 'totalBossKills'; value: number };

/** 来世への効果 */
export type LegacyEffect =
  | { kind: 'shopDiscount'; percent: number }
  | { kind: 'startingItem'; itemId: ItemId; count: number }
  | { kind: 'startingGold'; amount: number };

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
    id: 'midBoss1',
    name: '主殺し',
    description:
      'ダンジョンの主を初めて討った。その武勇は語り継がれ、来世の財布に100Gが積まれる。',
    condition: { kind: 'totalMidBossKills', value: 1 },
    effect: { kind: 'startingGold', amount: 100 },
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
