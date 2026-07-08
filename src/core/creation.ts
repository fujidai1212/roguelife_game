import { balance } from '../data/balance';
import type { JobDef } from '../data/jobs';
import type { LegacyStatBonus } from '../data/legacies';
import type { Rng } from './rng';
import type { Stats } from './types';

/** キャラ作成に関する純粋ロジック。年齢は startAge 固定でロールしない */

/** ステータスに補正を加える（職業・レガシーで共通。HPは全快で開始） */
export function applyStatBonus(stats: Stats, b: Required<LegacyStatBonus>): Stats {
  const maxHp = stats.maxHp + b.maxHp;
  return {
    maxHp,
    hp: maxHp,
    strength: stats.strength + b.strength,
    agility: stats.agility + b.agility,
    magic: stats.magic + b.magic,
    luck: stats.luck + b.luck,
  };
}

/** ロールしたステータスに職業の補正を加える */
export function applyJobBonus(stats: Stats, job: JobDef): Stats {
  return applyStatBonus(stats, job.statBonus);
}

function rollDice(rng: Rng, dice: { count: number; sides: number; bonus: number }): number {
  let total = dice.bonus;
  for (let i = 0; i < dice.count; i++) {
    total += rng.int(1, dice.sides);
  }
  return total;
}

/** 初期ステータスをダイスで決める */
export function rollStats(rng: Rng): Stats {
  const b = balance.creation;
  const maxHp = b.hpBase + rollDice(rng, b.hpDice);
  return {
    maxHp,
    hp: maxHp,
    strength: rollDice(rng, b.statDice),
    agility: rollDice(rng, b.statDice),
    magic: rollDice(rng, b.statDice),
    luck: rollDice(rng, b.statDice),
  };
}

/** 初期所持金を決める */
export function rollStartingGold(rng: Rng): number {
  return rollDice(rng, balance.creation.startingGoldDice) * balance.creation.startingGoldMultiplier;
}

/** 寿命を決める（プレイヤーには見せない） */
export function rollLifespan(rng: Rng): number {
  return balance.aging.lifespanBase + rng.int(0, balance.aging.lifespanRandomMax);
}
