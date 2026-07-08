import { describe, expect, it } from 'vitest';

import { balance } from '../../data/balance';
import { advanceDays } from '../aging';
import type { LifeState } from '../types';

const { daysPerYear } = balance.time;
const { declineStartAge, statLossPerYear, maxHpLossPerYear, statFloor } = balance.aging;

function makeLife(overrides: Partial<LifeState> = {}): LifeState {
  return {
    character: {
      jobId: 'jobless',
      stats: { maxHp: 30, hp: 30, strength: 10, agility: 10, magic: 10, luck: 10 },
      ageYears: 20,
      gold: 50,
      items: {},
    },
    daysElapsed: 0,
    daysIntoYear: 0,
    lifespanYears: 70,
    scene: 'town',
    alive: true,
    ...overrides,
  };
}

describe('advanceDays: 日数進行', () => {
  it('1日進めると経過日数と年内日数が1増える', () => {
    const { life } = advanceDays(makeLife(), 1);
    expect(life.daysElapsed).toBe(1);
    expect(life.daysIntoYear).toBe(1);
  });

  it('daysPerYear 日で1歳加齢し、年内日数が0に戻る', () => {
    const { life, logs } = advanceDays(makeLife(), daysPerYear);
    expect(life.character.ageYears).toBe(21);
    expect(life.daysIntoYear).toBe(0);
    expect(logs.length).toBeGreaterThan(0);
  });

  it('複数年ぶんまとめて進めても年齢が正しく増える', () => {
    const { life } = advanceDays(makeLife(), daysPerYear * 3);
    expect(life.character.ageYears).toBe(23);
    expect(life.daysElapsed).toBe(daysPerYear * 3);
  });

  it('死亡している状態では日数が進まない', () => {
    const dead = makeLife({ alive: false, scene: 'death' });
    const { life, logs } = advanceDays(dead, 10);
    expect(life.daysElapsed).toBe(0);
    expect(logs).toEqual([]);
  });
});

describe('advanceDays: 加齢による衰え', () => {
  it('declineStartAge 以下では衰えない', () => {
    const young = makeLife({ character: { ...makeLife().character, ageYears: declineStartAge - 1 } });
    const { life } = advanceDays(young, daysPerYear);
    expect(life.character.ageYears).toBe(declineStartAge);
    expect(life.character.stats.strength).toBe(10);
    expect(life.character.stats.maxHp).toBe(30);
  });

  it('declineStartAge を超える加齢で力・素早さ・魔力・最大HPが減り、運は減らない', () => {
    const old = makeLife({ character: { ...makeLife().character, ageYears: declineStartAge } });
    const { life } = advanceDays(old, daysPerYear);
    const s = life.character.stats;
    expect(life.character.ageYears).toBe(declineStartAge + 1);
    expect(s.strength).toBe(10 - statLossPerYear);
    expect(s.agility).toBe(10 - statLossPerYear);
    expect(s.magic).toBe(10 - statLossPerYear);
    expect(s.maxHp).toBe(30 - maxHpLossPerYear);
    expect(s.luck).toBe(10);
  });

  it('現在HPは減った最大HPを超えない', () => {
    const old = makeLife({ character: { ...makeLife().character, ageYears: declineStartAge } });
    const { life } = advanceDays(old, daysPerYear);
    expect(life.character.stats.hp).toBeLessThanOrEqual(life.character.stats.maxHp);
  });

  it('何年衰えてもステータスは下限を下回らない', () => {
    const old = makeLife({
      lifespanYears: 200,
      character: { ...makeLife().character, ageYears: declineStartAge },
    });
    const { life } = advanceDays(old, daysPerYear * 50);
    const s = life.character.stats;
    expect(s.strength).toBeGreaterThanOrEqual(statFloor);
    expect(s.agility).toBeGreaterThanOrEqual(statFloor);
    expect(s.magic).toBeGreaterThanOrEqual(statFloor);
    expect(s.maxHp).toBeGreaterThanOrEqual(statFloor);
  });
});

describe('advanceDays: 老衰死', () => {
  it('寿命の年齢に達すると死亡し、場面が death になる', () => {
    const nearEnd = makeLife({
      lifespanYears: 21,
      character: { ...makeLife().character, ageYears: 20 },
    });
    const { life, logs } = advanceDays(nearEnd, daysPerYear);
    expect(life.alive).toBe(false);
    expect(life.deathCause).toBe('oldAge');
    expect(life.scene).toBe('death');
    expect(logs.length).toBeGreaterThan(0);
  });

  it('死亡した日以降は日数が進まない', () => {
    const nearEnd = makeLife({
      lifespanYears: 21,
      character: { ...makeLife().character, ageYears: 20 },
    });
    const { life } = advanceDays(nearEnd, daysPerYear * 10);
    expect(life.daysElapsed).toBe(daysPerYear);
  });
});
