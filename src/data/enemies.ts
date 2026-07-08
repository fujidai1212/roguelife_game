import type { EnemyId } from '../core/types';

/**
 * 敵のマスターデータ。追加はここに追記するだけで済むようにする
 * （CLAUDE.md アーキテクチャ原則3）。
 * ステータスは深度1基準の値。実際の出現時には深度スケールがかかる
 * （src/core/dungeon.ts の createEnemyInstance）。
 * TODO: 数値はすべて仮置き。フェーズ5のバランス調整パスで見直す。
 */

export interface EnemyDef {
  id: EnemyId;
  name: string;
  maxHp: number;
  attack: number;
  defense: number;
  agility: number;
  /** 倒したときに落とす金（G）の範囲（深度スケール前） */
  goldMin: number;
  goldMax: number;
  /** この深度以上で出現する */
  minDepth: number;
}

export const enemies: Record<EnemyId, EnemyDef> = {
  slime: {
    id: 'slime',
    name: 'スライム',
    maxHp: 8,
    attack: 4,
    defense: 1,
    agility: 3,
    goldMin: 3,
    goldMax: 8,
    minDepth: 1,
  },
  giantRat: {
    id: 'giantRat',
    name: '大ネズミ',
    maxHp: 10,
    attack: 5,
    defense: 0,
    agility: 8,
    goldMin: 4,
    goldMax: 10,
    minDepth: 1,
  },
  goblin: {
    id: 'goblin',
    name: 'ゴブリン',
    maxHp: 14,
    attack: 7,
    defense: 2,
    agility: 6,
    goldMin: 8,
    goldMax: 18,
    minDepth: 2,
  },
  skeleton: {
    id: 'skeleton',
    name: 'スケルトン',
    maxHp: 20,
    attack: 9,
    defense: 4,
    agility: 5,
    goldMin: 12,
    goldMax: 25,
    minDepth: 4,
  },
  orc: {
    id: 'orc',
    name: 'オーク',
    maxHp: 30,
    attack: 13,
    defense: 5,
    agility: 7,
    goldMin: 20,
    goldMax: 40,
    minDepth: 6,
  },
};

/** 出現テーブル（深度で minDepth フィルタをかけて抽選する） */
export const enemyPool: EnemyId[] = ['slime', 'giantRat', 'goblin', 'skeleton', 'orc'];
