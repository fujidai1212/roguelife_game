import type { JobId } from '../core/types';

/**
 * 職業のマスターデータ（GAME_DESIGN.md セクション2）。
 * 追加・調整はここに追記するだけで済むようにする（CLAUDE.md アーキテクチャ原則3）。
 * TODO: 補正値・解放コストは仮置き。フェーズ5のバランス調整パスで見直す。
 */

/** 戦闘コマンドとして使うアクティブスキル */
export type ActiveSkillId = 'magicAttack' | 'selfHeal';

/** 常時発動のパッシブスキル */
export type PassiveSkillId = 'firstStrike' | 'fleeBonus';

export interface JobDef {
  id: JobId;
  name: string;
  /** 解放に消費する魂の数（0なら最初から選べる） */
  unlockCost: number;
  /** ロール後の初期ステータスへの加算値 */
  statBonus: {
    maxHp: number;
    strength: number;
    agility: number;
    magic: number;
    luck: number;
  };
  /** 戦闘のスキルコマンド（ない職業もある） */
  activeSkill?: { id: ActiveSkillId; name: string };
  passives: PassiveSkillId[];
  description: string;
}

const noBonus = { maxHp: 0, strength: 0, agility: 0, magic: 0, luck: 0 };

export const jobs: Record<JobId, JobDef> = {
  jobless: {
    id: 'jobless',
    name: '無職',
    unlockCost: 0,
    statBonus: noBonus,
    passives: [],
    description: 'すべてが平凡。スキルもない。大半はこうやって死んでいく。',
  },
  swordsman: {
    id: 'swordsman',
    name: '剣士',
    unlockCost: 15,
    statBonus: { maxHp: 8, strength: 4, agility: 0, magic: 0, luck: 0 },
    passives: [],
    description: 'HPと力が高い。安定した近接戦闘。',
  },
  thief: {
    id: 'thief',
    name: '盗賊',
    unlockCost: 30,
    statBonus: { maxHp: 0, strength: 0, agility: 5, magic: 0, luck: 2 },
    passives: ['firstStrike', 'fleeBonus'],
    description: '素早さが高い。必ず先手を取り、逃げ足も速い。',
  },
  mage: {
    id: 'mage',
    name: '魔法使い',
    unlockCost: 60,
    statBonus: { maxHp: 0, strength: 0, agility: 0, magic: 5, luck: 0 },
    activeSkill: { id: 'magicAttack', name: '魔法攻撃' },
    passives: [],
    description: '魔力が高い。魔法攻撃は敵の防御を無視する。',
  },
  paladin: {
    id: 'paladin',
    name: '聖騎士',
    unlockCost: 120,
    statBonus: { maxHp: 6, strength: 3, agility: 2, magic: 3, luck: 2 },
    activeSkill: { id: 'selfHeal', name: '自己回復' },
    passives: [],
    description: '全体的に高水準の最上位職。自らの傷を癒せる。',
  },
};

/** 職業選択画面の並び順 */
export const jobOrder: JobId[] = ['jobless', 'swordsman', 'thief', 'mage', 'paladin'];
