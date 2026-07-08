import { describe, expect, it } from 'vitest';

import { jobs } from '../../data/jobs';
import { applyAction, newGame } from '../actions';
import { getChoices } from '../choices';
import { generateFloor } from '../dungeon';
import { createRng } from '../rng';
import { parseMeta, serializeMeta } from '../save';
import type { EnemyInstance, GameState, LifeState, MetaState, Stats } from '../types';

/** テスト用に任意の人生を組み立てる */
function makeState(
  meta: Partial<MetaState> = {},
  lifeOverrides: Partial<LifeState> = {},
  statOverrides: Partial<Stats> = {},
): GameState {
  const stats: Stats = {
    maxHp: 100,
    hp: 100,
    strength: 50,
    agility: 50,
    magic: 30,
    luck: 10,
    ...statOverrides,
  };
  return {
    phase: 'life',
    life: {
      character: { jobId: 'jobless', stats, ageYears: 18, gold: 50, items: {} },
      lifespanYears: 75,
      scene: 'town',
      alive: true,
      kills: 0,
      midBossKills: 0,
      bossKills: 0,
      maxDepth: 0,
      bonusSouls: 0,
      ...lifeOverrides,
    },
    meta: {
      souls: 0,
      unlockedJobs: ['jobless'],
      unlockedLegacies: [],
      totalDeaths: 0,
      totalKills: 0,
      totalMidBossKills: 0,
      totalBossKills: 0,
      bestDepth: 0,
      ...meta,
    },
    rngState: 999,
  };
}

const weakEnemy: EnemyInstance = {
  defId: 'slime',
  hp: 1,
  maxHp: 1,
  attack: 1,
  defense: 0,
  agility: 1,
  goldMin: 5,
  goldMax: 5,
};

describe('人生終了時の魂精算（applyAction のフック）', () => {
  it('戦闘死で魂が増え、精算結果がログと状態に残る', () => {
    const brutal: EnemyInstance = { ...weakEnemy, hp: 9999, maxHp: 9999, attack: 999, agility: 999 };
    let state = makeState(
      {},
      {
        scene: 'combat',
        maxDepth: 3,
        kills: 5,
        dungeon: { depth: 3, nodes: generateFloor(createRng(1), 1), currentNodeId: 0 },
        combat: { enemy: brutal, menu: 'main', context: 'node' },
      },
      { maxHp: 10, hp: 10, agility: 1 },
    );
    const { state: after, logs } = applyAction(state, { type: 'combat/attack' });
    expect(after.life!.alive).toBe(false);
    expect(after.life!.settlement).toBeDefined();
    expect(after.life!.settlement!.tier).toBe(1); // 深度3到達
    expect(after.meta.souls).toBe(after.life!.settlement!.souls);
    expect(after.meta.souls).toBeGreaterThan(0);
    expect(after.meta.totalDeaths).toBe(1);
    expect(after.meta.totalKills).toBe(5);
    expect(after.meta.bestDepth).toBe(3);
    expect(logs.join('')).toContain('魂');

    // 転生しても魂は残る
    const reborn = applyAction(after, { type: 'death/reincarnate' }).state;
    expect(reborn.phase).toBe('creation');
    expect(reborn.meta.souls).toBe(after.meta.souls);
  });

  it('精算は一度しか行われない（死後の無効アクションで二重加算しない）', () => {
    const brutal: EnemyInstance = { ...weakEnemy, hp: 9999, maxHp: 9999, attack: 999, agility: 999 };
    let state = makeState(
      {},
      {
        scene: 'combat',
        dungeon: { depth: 1, nodes: generateFloor(createRng(1), 1), currentNodeId: 0 },
        combat: { enemy: brutal, menu: 'main', context: 'node' },
      },
      { maxHp: 5, hp: 5, agility: 1 },
    );
    state = applyAction(state, { type: 'combat/attack' }).state;
    const soulsAfterDeath = state.meta.souls;
    state = applyAction(state, { type: 'combat/attack' }).state; // 無効
    expect(state.meta.souls).toBe(soulsAfterDeath);
  });
});

describe('自主引退（教会・ギルド）', () => {
  it('教会で確認を経て引退でき、魂ボーナスが付き、死亡数は増えない', () => {
    let state = makeState({}, { maxDepth: 3, kills: 8 });
    state.life!.character.ageYears = 40;
    state.life!.character.gold = 300;
    state = applyAction(state, { type: 'town/go', dest: 'church' }).state;
    expect(state.life!.scene).toBe('church');

    state = applyAction(state, { type: 'retire/ask' }).state;
    expect(state.life!.retireConfirm).toBe(true);

    // やめると戻れる
    const cancelled = applyAction(state, { type: 'retire/cancel' }).state;
    expect(cancelled.life!.retireConfirm).toBeUndefined();
    expect(cancelled.life!.alive).toBe(true);

    const { state: retired } = applyAction(state, { type: 'retire/confirm' });
    expect(retired.life!.alive).toBe(false);
    expect(retired.life!.deathCause).toBe('retired');
    expect(retired.life!.scene).toBe('death');
    expect(retired.meta.souls).toBeGreaterThan(0);
    expect(retired.meta.totalDeaths).toBe(0);
  });

  it('ギルドからも引退できる', () => {
    let state = makeState();
    state = applyAction(state, { type: 'town/go', dest: 'guild' }).state;
    expect(state.life!.scene).toBe('guild');
    state = applyAction(state, { type: 'retire/ask' }).state;
    state = applyAction(state, { type: 'retire/confirm' }).state;
    expect(state.life!.deathCause).toBe('retired');
  });
});

describe('職業の解放と補正', () => {
  it('魂が足りれば未解放の職業を選ぶと解放され、魂が減る', () => {
    let state = newGame(1, {
      souls: 20,
      unlockedJobs: ['jobless'],
      unlockedLegacies: [],
      totalDeaths: 1,
      totalKills: 0,
      totalMidBossKills: 0,
      totalBossKills: 0,
      bestDepth: 0,
    }).state;
    state = applyAction(state, { type: 'creation/confirmStats' }).state;
    const rolled = state.creation!.stats!;
    state = applyAction(state, { type: 'creation/chooseJob', jobId: 'swordsman' }).state;
    expect(state.phase).toBe('life');
    expect(state.meta.souls).toBe(20 - jobs.swordsman.unlockCost);
    expect(state.meta.unlockedJobs).toContain('swordsman');
    // ステータス補正が乗っている
    expect(state.life!.character.stats.strength).toBe(rolled.strength + jobs.swordsman.statBonus.strength);
    expect(state.life!.character.stats.maxHp).toBe(rolled.maxHp + jobs.swordsman.statBonus.maxHp);
  });

  it('魂が足りなければ解放できない（noop）', () => {
    let state = newGame(1).state; // souls 0
    state = applyAction(state, { type: 'creation/confirmStats' }).state;
    const result = applyAction(state, { type: 'creation/chooseJob', jobId: 'paladin' });
    expect(result.state).toBe(state);
  });

  it('一度解放した職業は次の周回でコストなしで選べる', () => {
    let state = newGame(2, {
      souls: 15,
      unlockedJobs: ['jobless', 'swordsman'],
      unlockedLegacies: [],
      totalDeaths: 1,
      totalKills: 0,
      totalMidBossKills: 0,
      totalBossKills: 0,
      bestDepth: 0,
    }).state;
    state = applyAction(state, { type: 'creation/confirmStats' }).state;
    state = applyAction(state, { type: 'creation/chooseJob', jobId: 'swordsman' }).state;
    expect(state.meta.souls).toBe(15); // 消費されない
  });
});

describe('職業スキル', () => {
  const makeCombat = (jobId: 'thief' | 'mage' | 'paladin', enemy: EnemyInstance, stats: Partial<Stats> = {}) => {
    const state = makeState(
      { unlockedJobs: ['jobless', jobId] },
      {
        scene: 'combat',
        dungeon: { depth: 1, nodes: generateFloor(createRng(5), 1), currentNodeId: 0 },
        combat: { enemy, menu: 'main', context: 'node' },
      },
      stats,
    );
    state.life!.character.jobId = jobId;
    return state;
  };

  it('魔法使いの魔法攻撃は敵の防御を無視する', () => {
    const armored: EnemyInstance = { ...weakEnemy, hp: 30, maxHp: 30, defense: 999, agility: 1 };
    const state = makeCombat('mage', armored, { magic: 20, strength: 5 });
    // スキルコマンドが出ている
    const labels = getChoices(state).map((b) => b.choice.id);
    expect(labels).toContain('skill');
    const after = applyAction(state, { type: 'combat/skill' }).state;
    // 防御999でも魔力ぶんのダメージが通る（通常攻撃なら最低1）
    const dealt = 30 - after.life!.combat!.enemy.hp;
    expect(dealt).toBeGreaterThan(10);
  });

  it('聖騎士の自己回復はHPを回復し、ターンを消費する（敵の攻撃を受ける）', () => {
    const enemy: EnemyInstance = { ...weakEnemy, hp: 50, maxHp: 50, attack: 5, agility: 1 };
    const state = makeCombat('paladin', enemy, { maxHp: 100, hp: 40 });
    const after = applyAction(state, { type: 'combat/skill' }).state;
    const hp = after.life!.character.stats.hp;
    // 35%回復（35）から敵の一撃ぶんを引いた値になっているはず
    expect(hp).toBeGreaterThan(40);
    expect(hp).toBeLessThan(75 + 1);
  });

  it('盗賊は敵より遅くても必ず先手を取る', () => {
    const fastEnemy: EnemyInstance = { ...weakEnemy, hp: 1, maxHp: 1, attack: 999, agility: 999 };
    const state = makeCombat('thief', fastEnemy, { agility: 1, strength: 50, maxHp: 10, hp: 10 });
    // 敵の素早さ999だが、盗賊の先制攻撃で先に倒せば無傷で勝つ
    const after = applyAction(state, { type: 'combat/attack' }).state;
    expect(after.life!.alive).toBe(true);
    expect(after.life!.combat).toBeUndefined();
    expect(after.life!.kills).toBe(1);
  });
});

describe('メタセーブ（別領域の永続化）', () => {
  it('シリアライズ→復元で同じメタに戻る', () => {
    const meta: MetaState = {
      souls: 42,
      unlockedJobs: ['jobless', 'thief'],
      unlockedLegacies: ['depth5'],
      totalDeaths: 7,
      totalKills: 55,
      totalMidBossKills: 0,
      totalBossKills: 0,
      bestDepth: 6,
    };
    expect(parseMeta(serializeMeta(meta))).toEqual(meta);
  });

  it('壊れたデータ・必須フィールド欠落は null', () => {
    expect(parseMeta('{broken')).toBeNull();
    expect(parseMeta(JSON.stringify({ version: 1, meta: { souls: 1 } }))).toBeNull();
  });
});

describe('レガシー解放の通しフロー', () => {
  it('3回目の死でレガシー「死に慣れた魂」が解放され、次の人生に薬草がつく', () => {
    const brutal: EnemyInstance = { ...weakEnemy, hp: 9999, maxHp: 9999, attack: 999, agility: 999 };
    let state = makeState(
      { totalDeaths: 2 }, // すでに2回死んでいる
      {
        scene: 'combat',
        dungeon: { depth: 1, nodes: generateFloor(createRng(9), 1), currentNodeId: 0 },
        combat: { enemy: brutal, menu: 'main', context: 'node' },
      },
      { maxHp: 5, hp: 5, agility: 1 },
    );
    const { state: dead, logs } = applyAction(state, { type: 'combat/attack' });
    expect(dead.meta.totalDeaths).toBe(3);
    expect(dead.meta.unlockedLegacies).toContain('deaths3');
    expect(logs.join('')).toContain('レガシー解放');

    // 転生 → 無職を選ぶと、薬草2つ持ちで始まる
    let next = applyAction(dead, { type: 'death/reincarnate' }).state;
    next = applyAction(next, { type: 'creation/confirmStats' }).state;
    next = applyAction(next, { type: 'creation/chooseJob', jobId: 'jobless' }).state;
    expect(next.life!.character.items.herb).toBe(2);
  });
});

describe('通しの周回ループ', () => {
  it('死んで魂を得て、職業を解放して再挑戦できる（ROADMAP完了条件）', () => {
    // 引退で確実に魂を稼ぐ人生を繰り返し、剣士（15）を解放する
    let meta: MetaState = {
      souls: 0,
      unlockedJobs: ['jobless'],
      unlockedLegacies: [],
      totalDeaths: 0,
      totalKills: 0,
      totalMidBossKills: 0,
      totalBossKills: 0,
      bestDepth: 0,
    };
    let guard = 0;
    while (meta.souls < jobs.swordsman.unlockCost && guard++ < 20) {
      let state = makeState({ ...meta }, { maxDepth: 3 }); // 深度3相当の実績を持つ人生
      state.life!.character.gold = 500;
      state = applyAction(state, { type: 'town/go', dest: 'church' }).state;
      state = applyAction(state, { type: 'retire/ask' }).state;
      state = applyAction(state, { type: 'retire/confirm' }).state;
      meta = state.meta;
    }
    expect(meta.souls).toBeGreaterThanOrEqual(jobs.swordsman.unlockCost);

    let state = newGame(7, meta).state;
    state = applyAction(state, { type: 'creation/confirmStats' }).state;
    state = applyAction(state, { type: 'creation/chooseJob', jobId: 'swordsman' }).state;
    expect(state.life!.character.jobId).toBe('swordsman');
    expect(state.meta.unlockedJobs).toContain('swordsman');
  });
});
