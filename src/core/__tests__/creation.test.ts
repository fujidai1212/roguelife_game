import { describe, expect, it } from 'vitest';

import { balance } from '../../data/balance';
import { applyAgeBonus, rollAge, rollLifespan, rollStartingGold, rollStats } from '../creation';
import { createRng } from '../rng';
import type { Stats } from '../types';

const b = balance.creation;
const SAMPLES = 200;

describe('rollStats', () => {
  it('同じシードからは同じ結果になる（決定性）', () => {
    expect(rollStats(createRng(42))).toEqual(rollStats(createRng(42)));
  });

  it('各ステータスがダイスの理論レンジに収まる', () => {
    const rng = createRng(1);
    const statMin = b.statDice.count + b.statDice.bonus;
    const statMax = b.statDice.count * b.statDice.sides + b.statDice.bonus;
    for (let i = 0; i < SAMPLES; i++) {
      const s = rollStats(rng);
      for (const v of [s.strength, s.agility, s.magic, s.luck]) {
        expect(v).toBeGreaterThanOrEqual(statMin);
        expect(v).toBeLessThanOrEqual(statMax);
      }
      expect(s.maxHp).toBeGreaterThanOrEqual(b.hpBase + b.hpDice.count);
      expect(s.maxHp).toBeLessThanOrEqual(b.hpBase + b.hpDice.count * b.hpDice.sides);
      expect(s.hp).toBe(s.maxHp);
    }
  });
});

describe('rollAge / rollLifespan / rollStartingGold', () => {
  it('年齢が ageMin〜ageMax に収まる', () => {
    const rng = createRng(2);
    for (let i = 0; i < SAMPLES; i++) {
      const age = rollAge(rng);
      expect(age).toBeGreaterThanOrEqual(b.ageMin);
      expect(age).toBeLessThanOrEqual(b.ageMax);
    }
  });

  it('寿命が lifespanBase〜lifespanBase+lifespanRandomMax に収まる', () => {
    const rng = createRng(3);
    const { lifespanBase, lifespanRandomMax } = balance.aging;
    for (let i = 0; i < SAMPLES; i++) {
      const span = rollLifespan(rng);
      expect(span).toBeGreaterThanOrEqual(lifespanBase);
      expect(span).toBeLessThanOrEqual(lifespanBase + lifespanRandomMax);
    }
  });

  it('初期所持金がダイス×倍率のレンジに収まる', () => {
    const rng = createRng(4);
    const min = b.startingGoldDice.count * b.startingGoldMultiplier;
    const max = b.startingGoldDice.count * b.startingGoldDice.sides * b.startingGoldMultiplier;
    for (let i = 0; i < SAMPLES; i++) {
      const gold = rollStartingGold(rng);
      expect(gold).toBeGreaterThanOrEqual(min);
      expect(gold).toBeLessThanOrEqual(max);
      expect(gold % b.startingGoldMultiplier).toBe(0);
    }
  });
});

describe('applyAgeBonus: 年上ほど初期ステータスが高い', () => {
  const base: Stats = { maxHp: 25, hp: 25, strength: 8, agility: 8, magic: 8, luck: 8 };

  it('最年少（ageMin）では補正なし', () => {
    expect(applyAgeBonus(base, b.ageMin)).toEqual(base);
  });

  it('ageBonusPerYears 年ごとに全ステータス+1', () => {
    const boosted = applyAgeBonus(base, b.ageMin + b.ageBonusPerYears * 2);
    expect(boosted.strength).toBe(base.strength + 2);
    expect(boosted.agility).toBe(base.agility + 2);
    expect(boosted.magic).toBe(base.magic + 2);
    expect(boosted.luck).toBe(base.luck + 2);
    expect(boosted.maxHp).toBe(base.maxHp + 2);
    expect(boosted.hp).toBe(base.hp + 2);
  });

  it('元のオブジェクトを変更しない（純粋関数）', () => {
    applyAgeBonus(base, b.ageMax);
    expect(base.strength).toBe(8);
  });
});
