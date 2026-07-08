import { describe, expect, it } from 'vitest';

import { balance } from '../../data/balance';
import { rollLifespan, rollStartingGold, rollStats } from '../creation';
import { createRng } from '../rng';

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

describe('rollLifespan / rollStartingGold', () => {
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
