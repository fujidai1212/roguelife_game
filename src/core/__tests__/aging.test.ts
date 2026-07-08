import { describe, expect, it } from 'vitest';

import { balance } from '../../data/balance';
import { advanceAge, roundAge } from '../aging';
import type { LifeState } from '../types';

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
    lifespanYears: 70,
    scene: 'town',
    alive: true,
    kills: 0,
    maxDepth: 0,
    ...overrides,
  };
}

describe('advanceAge: 年齢コストの支払い', () => {
  it('小数の年齢コストがそのまま加算される', () => {
    const { life, logs } = advanceAge(makeLife(), 0.3);
    expect(life.character.ageYears).toBe(20.3);
    expect(logs).toEqual([]); // 誕生日を越えていないのでログなし
  });

  it('小さなコストを繰り返しても誤差が蓄積しない（丸め）', () => {
    let life = makeLife();
    for (let i = 0; i < 10; i++) {
      life = advanceAge(life, 0.1).life;
    }
    expect(life.character.ageYears).toBe(21);
  });

  it('誕生日を越えると加齢ログが出る', () => {
    const { life, logs } = advanceAge(makeLife(), 1);
    expect(life.character.ageYears).toBe(21);
    expect(logs.length).toBe(1);
  });

  it('複数年まとめて支払うと年数分の誕生日を通過する', () => {
    const { life, logs } = advanceAge(makeLife(), 3);
    expect(life.character.ageYears).toBe(23);
    expect(logs.length).toBe(3);
  });

  it('コスト0以下・死亡中は何も起きない', () => {
    expect(advanceAge(makeLife(), 0).life.character.ageYears).toBe(20);
    const dead = makeLife({ alive: false, scene: 'death' });
    const { life, logs } = advanceAge(dead, 5);
    expect(life.character.ageYears).toBe(20);
    expect(logs).toEqual([]);
  });
});

describe('advanceAge: 加齢による衰え', () => {
  it('declineStartAge 以下の誕生日では衰えない', () => {
    const young = makeLife({
      character: { ...makeLife().character, ageYears: declineStartAge - 1 },
    });
    const { life } = advanceAge(young, 1);
    expect(life.character.ageYears).toBe(declineStartAge);
    expect(life.character.stats.strength).toBe(10);
    expect(life.character.stats.maxHp).toBe(30);
  });

  it('declineStartAge を超える誕生日で力・素早さ・魔力・最大HPが減り、運は減らない', () => {
    const old = makeLife({ character: { ...makeLife().character, ageYears: declineStartAge } });
    const { life } = advanceAge(old, 1);
    const s = life.character.stats;
    expect(life.character.ageYears).toBe(declineStartAge + 1);
    expect(s.strength).toBe(10 - statLossPerYear);
    expect(s.agility).toBe(10 - statLossPerYear);
    expect(s.magic).toBe(10 - statLossPerYear);
    expect(s.maxHp).toBe(30 - maxHpLossPerYear);
    expect(s.luck).toBe(10);
  });

  it('小数コストの合計で誕生日を跨いだ場合も衰える', () => {
    const old = makeLife({
      character: { ...makeLife().character, ageYears: roundAge(declineStartAge + 0.9) },
    });
    const { life } = advanceAge(old, 0.2);
    expect(life.character.stats.strength).toBe(10 - statLossPerYear);
  });

  it('現在HPは減った最大HPを超えない', () => {
    const old = makeLife({ character: { ...makeLife().character, ageYears: declineStartAge } });
    const { life } = advanceAge(old, 1);
    expect(life.character.stats.hp).toBeLessThanOrEqual(life.character.stats.maxHp);
  });

  it('何年衰えてもステータスは下限を下回らない', () => {
    const old = makeLife({
      lifespanYears: 200,
      character: { ...makeLife().character, ageYears: declineStartAge },
    });
    const { life } = advanceAge(old, 50);
    const s = life.character.stats;
    expect(s.strength).toBeGreaterThanOrEqual(statFloor);
    expect(s.agility).toBeGreaterThanOrEqual(statFloor);
    expect(s.magic).toBeGreaterThanOrEqual(statFloor);
    expect(s.maxHp).toBeGreaterThanOrEqual(statFloor);
  });
});

describe('advanceAge: 老衰死', () => {
  it('寿命の年齢に達すると死亡し、場面が death になる', () => {
    const nearEnd = makeLife({
      lifespanYears: 21,
      character: { ...makeLife().character, ageYears: 20.5 },
    });
    const { life, logs } = advanceAge(nearEnd, 1);
    expect(life.alive).toBe(false);
    expect(life.deathCause).toBe('oldAge');
    expect(life.scene).toBe('death');
    expect(logs.length).toBeGreaterThan(0);
  });

  it('大きな年齢コストを払っても、年齢は死亡した歳で止まる', () => {
    const nearEnd = makeLife({
      lifespanYears: 21,
      character: { ...makeLife().character, ageYears: 20 },
    });
    const { life } = advanceAge(nearEnd, 10);
    expect(life.character.ageYears).toBe(21);
    expect(life.alive).toBe(false);
  });
});
