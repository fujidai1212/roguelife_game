import type { EnemyId } from '../core/types';

/**
 * 敵のマスターデータ。追加はここに追記するだけで済むようにする
 * （CLAUDE.md アーキテクチャ原則3）。
 * ステータスは深度1基準の値。実際の出現時には深度スケールがかかる
 * （src/core/dungeon.ts の createEnemyInstance）。ボスも同様にスケールするので、
 * 出現深度での実効値を意識して基準値を決めること。
 * フェーズ5でシミュレーション（npm run simulate）に基づいて調整済み。
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
  // --- 通常の出現テーブルには入らない特殊な敵 ---
  guard: {
    id: 'guard',
    name: '用心棒',
    maxHp: 25,
    attack: 10,
    defense: 3,
    agility: 8,
    goldMin: 5,
    goldMax: 15,
    minDepth: 1,
  },
  goldenSlime: {
    id: 'goldenSlime',
    name: '金色のスライム',
    maxHp: 6,
    attack: 2,
    defense: 8,
    agility: 15,
    goldMin: 60,
    goldMax: 120,
    minDepth: 1,
  },
  // --- ボス（フロア終点のボスノードにのみ出現。通常テーブルには入らない） ---
  minotaur: {
    id: 'minotaur',
    name: 'ミノタウロス',
    maxHp: 38,
    attack: 12,
    defense: 4,
    agility: 6,
    goldMin: 80,
    goldMax: 150,
    minDepth: 1,
  },
  lich: {
    id: 'lich',
    name: 'リッチ',
    maxHp: 50,
    attack: 15,
    defense: 4,
    agility: 9,
    goldMin: 150,
    goldMax: 250,
    minDepth: 8,
  },
  ancientDragon: {
    id: 'ancientDragon',
    name: 'エンシェントドラゴン',
    maxHp: 70,
    attack: 14,
    defense: 4,
    agility: 10,
    goldMin: 500,
    goldMax: 900,
    minDepth: 1,
  },
};

/** 出現テーブル（深度で minDepth フィルタをかけて抽選する）。特殊な敵は含めない */
export const enemyPool: EnemyId[] = ['slime', 'giantRat', 'goblin', 'skeleton', 'orc'];

/** 中ボスの候補（深度で minDepth フィルタをかけて抽選する） */
export const midBossPool: EnemyId[] = ['minotaur', 'lich'];

/** 最深部ボス（v1のゴール。深度は balance.dungeon.boss.finalDepth） */
export const finalBossId: EnemyId = 'ancientDragon';
