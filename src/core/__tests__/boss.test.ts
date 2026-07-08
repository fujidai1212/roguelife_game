import { describe, expect, it } from 'vitest';

import { balance } from '../../data/balance';
import { applyAction } from '../actions';
import { getChoices } from '../choices';
import { floorTerminalKind, generateFloor } from '../dungeon';
import { createRng } from '../rng';
import { parseMeta, serializeMeta } from '../save';
import type { DungeonNode, GameState, LifeState, MetaState, Stats } from '../types';

const bossBalance = balance.dungeon.boss;

/** 入場地点 → ボスノード だけの最小フロア */
function bossFloor(kind: 'midBoss' | 'boss'): DungeonNode[] {
  return [
    { id: 0, row: 0, kind: 'entrance', hint: '', edges: [1] },
    { id: 1, row: 1, kind, hint: '', edges: [] },
  ];
}

function makeMeta(overrides: Partial<MetaState> = {}): MetaState {
  return {
    souls: 0,
    unlockedJobs: ['jobless'],
    unlockedLegacies: [],
    totalDeaths: 0,
    totalKills: 0,
    totalMidBossKills: 0,
    totalBossKills: 0,
    bestDepth: 0,
    ...overrides,
  };
}

function makeState(
  statOverrides: Partial<Stats> = {},
  lifeOverrides: Partial<LifeState> = {},
): GameState {
  const stats: Stats = {
    maxHp: 500,
    hp: 500,
    strength: 1000,
    agility: 100,
    magic: 10,
    luck: 10,
    ...statOverrides,
  };
  return {
    phase: 'life',
    life: {
      character: { jobId: 'jobless', stats, ageYears: 18, gold: 50, items: {} },
      lifespanYears: 75,
      scene: 'dungeon',
      alive: true,
      kills: 0,
      midBossKills: 0,
      bossKills: 0,
      maxDepth: 4,
      bonusSouls: 0,
      ...lifeOverrides,
    },
    meta: makeMeta(),
    rngState: 12345,
  };
}

describe('ボスフロアの生成', () => {
  it('中ボス間隔の深度では終点が中ボス、最深部ではボス、それ以外は野営地', () => {
    expect(floorTerminalKind(1)).toBe('camp');
    expect(floorTerminalKind(bossBalance.midBossInterval)).toBe('midBoss');
    expect(floorTerminalKind(bossBalance.midBossInterval * 2)).toBe('midBoss');
    expect(floorTerminalKind(bossBalance.finalDepth)).toBe('boss');
  });

  it('generateFloor はボス深度で終点がボスノードになる', () => {
    const midBossFloor = generateFloor(createRng(1), bossBalance.midBossInterval);
    expect(midBossFloor[midBossFloor.length - 1].kind).toBe('midBoss');
    const finalFloor = generateFloor(createRng(1), bossBalance.finalDepth);
    expect(finalFloor[finalFloor.length - 1].kind).toBe('boss');
    const normalFloor = generateFloor(createRng(1), 1);
    expect(normalFloor[normalFloor.length - 1].kind).toBe('camp');
  });
});

describe('中ボス戦', () => {
  it('中ボスノードに到達すると戦闘になり、倒すとその場が野営地になる', () => {
    let state = makeState(
      {},
      { dungeon: { depth: 4, nodes: bossFloor('midBoss'), currentNodeId: 0 } },
    );
    state = applyAction(state, { type: 'dungeon/advance', nodeId: 1 }).state;
    expect(state.life!.scene).toBe('combat');
    expect(state.life!.combat!.bossKind).toBe('mid');

    // 力1000なので一撃で倒せる
    state = applyAction(state, { type: 'combat/attack' }).state;
    expect(state.life!.alive).toBe(true);
    expect(state.life!.scene).toBe('camp');
    expect(state.life!.midBossKills).toBe(1);
    expect(state.life!.combat).toBeUndefined();

    // 野営地として機能する（眠って次の深度へ）
    state = applyAction(state, { type: 'camp/sleep' }).state;
    expect(state.life!.dungeon!.depth).toBe(5);
  });

  it('ボス戦から逃げるとボスノードに留まり、「再び挑む」で全快の個体と再戦できる', () => {
    let state = makeState(
      { agility: 999, luck: 999, strength: 1 },
      { dungeon: { depth: 4, nodes: bossFloor('midBoss'), currentNodeId: 0 } },
    );
    state = applyAction(state, { type: 'dungeon/advance', nodeId: 1 }).state;
    const bossMaxHp = state.life!.combat!.enemy.maxHp;

    // 一度殴ってから逃げる（逃走成功率は上限90%なので成功するまで試す）
    state = applyAction(state, { type: 'combat/attack' }).state;
    for (let i = 0; i < 100 && state.life!.scene === 'combat'; i++) {
      state = applyAction(state, { type: 'combat/flee' }).state;
    }
    expect(state.life!.scene).toBe('dungeon');

    // 選択肢は「再び挑む」のみ
    const choices = getChoices(state);
    expect(choices.map((b) => b.action.type)).toEqual(['dungeon/challenge']);

    state = applyAction(state, choices[0].action).state;
    expect(state.life!.scene).toBe('combat');
    expect(state.life!.combat!.bossKind).toBe('mid');
    expect(state.life!.combat!.enemy.hp).toBe(bossMaxHp); // 全快している
  });
});

describe('最深部ボスと大団円', () => {
  function winFinalBoss(gold = 50) {
    let state = makeState(
      {},
      {
        character: {
          jobId: 'jobless',
          stats: { maxHp: 500, hp: 500, strength: 1000, agility: 100, magic: 10, luck: 10 },
          ageYears: 30,
          gold,
          items: {},
        },
        kills: 10,
        midBossKills: 2,
        maxDepth: bossBalance.finalDepth,
        dungeon: { depth: bossBalance.finalDepth, nodes: bossFloor('boss'), currentNodeId: 0 },
      },
    );
    state = applyAction(state, { type: 'dungeon/advance', nodeId: 1 }).state;
    expect(state.life!.combat!.bossKind).toBe('final');
    return applyAction(state, { type: 'combat/attack' });
  }

  it('倒すと人生が大団円で終わり、ティア4（上限なし）で精算される', () => {
    const { state } = winFinalBoss(10000);
    const life = state.life!;
    expect(life.alive).toBe(false);
    expect(life.deathCause).toBe('victory');
    expect(life.scene).toBe('death');
    expect(life.bossKills).toBe(1);
    expect(life.settlement!.tier).toBe(4);
    // ティア3の上限80を超えて獲得できている（金10000G≒魂100以上）
    expect(life.settlement!.souls).toBeGreaterThan(80);
  });

  it('大団円は死亡数に数えず、ボス撃破の統計とレガシーが解放される', () => {
    const { state } = winFinalBoss();
    expect(state.meta.totalDeaths).toBe(0);
    expect(state.meta.totalBossKills).toBe(1);
    expect(state.meta.totalMidBossKills).toBe(2);
    // 中ボス初撃破・ボス初撃破のレガシーが解放される
    expect(state.meta.unlockedLegacies).toContain('midBoss1');
    expect(state.meta.unlockedLegacies).toContain('boss1');
  });

  it('倒した後は「来世へ」しか選べない', () => {
    const { state } = winFinalBoss();
    expect(getChoices(state).map((b) => b.action.type)).toEqual(['death/reincarnate']);
  });
});

describe('メタセーブの後方互換', () => {
  it('ボス撃破数のない古いメタセーブは0で補完して読める', () => {
    const old = {
      version: 1,
      meta: {
        souls: 42,
        unlockedJobs: ['jobless'],
        unlockedLegacies: [],
        totalDeaths: 3,
        totalKills: 10,
        bestDepth: 5,
      },
    };
    const meta = parseMeta(JSON.stringify(old));
    expect(meta).not.toBeNull();
    expect(meta!.souls).toBe(42);
    expect(meta!.totalMidBossKills).toBe(0);
    expect(meta!.totalBossKills).toBe(0);
  });

  it('新しいメタセーブはそのまま往復できる', () => {
    const meta = makeMeta({ totalMidBossKills: 3, totalBossKills: 1 });
    expect(parseMeta(serializeMeta(meta))).toEqual(meta);
  });
});
