import { describe, expect, it } from 'vitest';

import { balance } from '../../data/balance';
import { applyLifeEndToMeta, evaluateTier, settleLife } from '../souls';
import { newlyUnlockedLegacies, shopPrice, startingBonuses } from '../legacies';
import type { LifeState, MetaState } from '../types';

function makeDeadLife(overrides: Partial<LifeState> = {}): LifeState {
  return {
    character: {
      jobId: 'jobless',
      stats: { maxHp: 30, hp: 0, strength: 10, agility: 10, magic: 10, luck: 10 },
      ageYears: 30,
      gold: 100,
      items: {},
    },
    lifespanYears: 70,
    scene: 'death',
    alive: false,
    deathCause: 'battle',
    kills: 5,
    maxDepth: 1,
    ...overrides,
  };
}

function makeMeta(overrides: Partial<MetaState> = {}): MetaState {
  return {
    souls: 0,
    unlockedJobs: ['jobless'],
    unlockedLegacies: [],
    totalDeaths: 0,
    totalKills: 0,
    bestDepth: 0,
    ...overrides,
  };
}

describe('evaluateTier: 達成度ティア判定', () => {
  it('何も成し遂げていなければティア0', () => {
    expect(evaluateTier(makeDeadLife({ maxDepth: 0, kills: 0 }))).toBe(0);
  });

  it('深度3到達 または 500G でティア1', () => {
    expect(evaluateTier(makeDeadLife({ maxDepth: 3 }))).toBe(1);
    const rich = makeDeadLife();
    rich.character.gold = 500;
    expect(evaluateTier(rich)).toBe(1);
  });

  it('深度6 または 2000G でティア2、深度10でティア3', () => {
    expect(evaluateTier(makeDeadLife({ maxDepth: 6 }))).toBe(2);
    const rich = makeDeadLife();
    rich.character.gold = 2000;
    expect(evaluateTier(rich)).toBe(2);
    expect(evaluateTier(makeDeadLife({ maxDepth: 10 }))).toBe(3);
  });
});

describe('settleLife: 魂精算', () => {
  it('獲得魂 = 生きた年数・撃破数・所持金から計算される', () => {
    const b = balance.souls;
    // 30歳死亡（12年生存）・5killed・100G → 12*0.5 + 5*1 + 1 = 12
    const life = makeDeadLife({ maxDepth: 3 }); // ティア1（上限15）
    const s = settleLife(life);
    const expected = Math.floor(12 * b.perYearLived + 5 * b.perKill + 100 / b.goldPerSoul);
    expect(s.souls).toBe(expected);
    expect(s.tier).toBe(1);
  });

  it('ティア上限でキャップされる（野垂れ死には最大5）', () => {
    const life = makeDeadLife({ maxDepth: 0, kills: 0 });
    life.character.ageYears = 60; // 42年生きても
    life.character.gold = 400; // 500G未満・深度0なのでティア0
    const s = settleLife(life);
    expect(s.tier).toBe(0);
    expect(s.souls).toBe(5);
  });

  it('引退はボーナス倍率がかかる', () => {
    const died = settleLife(makeDeadLife({ maxDepth: 3 }));
    const retired = settleLife(makeDeadLife({ maxDepth: 3, deathCause: 'retired' }));
    expect(retired.souls).toBeGreaterThanOrEqual(died.souls);
  });
});

describe('applyLifeEndToMeta: メタ状態への反映', () => {
  it('魂・撃破数・最高深度が積み上がり、死亡数が増える', () => {
    const life = makeDeadLife({ maxDepth: 4, kills: 7 });
    const meta = applyLifeEndToMeta(makeMeta({ bestDepth: 2 }), life, { tier: 1, souls: 10 });
    expect(meta.souls).toBe(10);
    expect(meta.totalDeaths).toBe(1);
    expect(meta.totalKills).toBe(7);
    expect(meta.bestDepth).toBe(4);
  });

  it('引退は死亡数に数えない', () => {
    const life = makeDeadLife({ deathCause: 'retired' });
    const meta = applyLifeEndToMeta(makeMeta(), life, { tier: 0, souls: 5 });
    expect(meta.totalDeaths).toBe(0);
  });
});

describe('レガシー', () => {
  it('条件を満たすと解放候補になり、解放済みは再出現しない', () => {
    const before = makeMeta({ bestDepth: 4 });
    expect(newlyUnlockedLegacies(before).map((l) => l.id)).toEqual([]);
    const after = makeMeta({ bestDepth: 5 });
    expect(newlyUnlockedLegacies(after).map((l) => l.id)).toContain('depth5');
    const unlocked = makeMeta({ bestDepth: 5, unlockedLegacies: ['depth5'] });
    expect(newlyUnlockedLegacies(unlocked).map((l) => l.id)).not.toContain('depth5');
  });

  it('道具屋の割引が価格に反映される', () => {
    expect(shopPrice(makeMeta(), 100)).toBe(100);
    expect(shopPrice(makeMeta({ unlockedLegacies: ['depth5'] }), 100)).toBe(90);
  });

  it('開始時ボーナス（薬草・所持金）が合算される', () => {
    const none = startingBonuses(makeMeta());
    expect(none.gold).toBe(0);
    expect(none.items).toEqual({});
    const both = startingBonuses(makeMeta({ unlockedLegacies: ['deaths3', 'kills30'] }));
    expect(both.gold).toBe(30);
    expect(both.items.herb).toBe(2);
  });
});
