import { balance } from '../data/balance';
import type { Rng } from './rng';
import type { Stats } from './types';

/** キャラ作成に関する純粋ロジック */

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

/** 年齢をダイスで決める（16〜40歳） */
export function rollAge(rng: Rng): number {
  return rng.int(balance.creation.ageMin, balance.creation.ageMax);
}

/** 年上ほど初期ステータスに補正を加える（GAME_DESIGN.md セクション2） */
export function applyAgeBonus(stats: Stats, ageYears: number): Stats {
  const bonus = Math.floor((ageYears - balance.creation.ageMin) / balance.creation.ageBonusPerYears);
  if (bonus <= 0) return stats;
  return {
    ...stats,
    maxHp: stats.maxHp + bonus,
    hp: stats.hp + bonus,
    strength: stats.strength + bonus,
    agility: stats.agility + bonus,
    magic: stats.magic + bonus,
    luck: stats.luck + bonus,
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
