import { describe, expect, it } from 'vitest';

import { applyAction } from '../actions';
import { getChoices, getPersistentActions } from '../choices';
import { generateFloor } from '../dungeon';
import { createRng } from '../rng';
import type { EnemyInstance, GameState, LifeState, Stats } from '../types';

/** テスト用に任意のステータスの人生を組み立てる */
function makeState(statOverrides: Partial<Stats> = {}, lifeOverrides: Partial<LifeState> = {}): GameState {
  const stats: Stats = {
    maxHp: 500,
    hp: 500,
    strength: 100,
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
      scene: 'town',
      alive: true,
      ...lifeOverrides,
    },
    meta: { souls: 0, unlockedJobs: ['jobless'], totalDeaths: 0 },
    rngState: 12345,
  };
}

/**
 * 野営地に着くまで自動でプレイする。
 * 戦闘は攻撃、宝箱・泉は見送り、分岐は常に最初の選択肢を選ぶ。
 */
function walkToCamp(state: GameState, maxSteps = 300): GameState {
  for (let i = 0; i < maxSteps; i++) {
    const life = state.life!;
    if (!life.alive) throw new Error('died during walkToCamp');
    if (life.scene === 'camp') return state;
    if (life.scene === 'combat') {
      state = applyAction(state, { type: 'combat/attack' }).state;
      continue;
    }
    if (life.dungeon?.pendingEvent === 'chest') {
      state = applyAction(state, { type: 'dungeon/chest', open: false }).state;
      continue;
    }
    if (life.dungeon?.pendingEvent === 'fountain') {
      state = applyAction(state, { type: 'dungeon/fountain', drink: false }).state;
      continue;
    }
    const choices = getChoices(state);
    if (choices.length === 0) throw new Error(`no choices in scene ${life.scene}`);
    state = applyAction(state, choices[0].action).state;
  }
  throw new Error('camp not reached within step limit');
}

describe('ダンジョン通しプレイ', () => {
  it('町→入場→探索→野営地→眠って深度2、まで通しで進める', () => {
    let state = makeState();
    state = applyAction(state, { type: 'town/go', dest: 'dungeon' }).state;
    expect(state.life!.scene).toBe('dungeon');
    expect(state.life!.dungeon!.depth).toBe(1);

    // 進行選択肢は常に1〜3つ
    const choices = getChoices(state);
    expect(choices.length).toBeGreaterThanOrEqual(1);
    expect(choices.length).toBeLessThanOrEqual(3);

    state = walkToCamp(state);
    expect(state.life!.scene).toBe('camp');

    const ageBefore = state.life!.character.ageYears;
    state = applyAction(state, { type: 'camp/sleep' }).state;
    expect(state.life!.dungeon!.depth).toBe(2);
    expect(state.life!.scene).toBe('dungeon');
    expect(state.life!.character.ageYears).toBeGreaterThan(ageBefore);
  });

  it('歩いて引き返すと（戦闘をこなしつつ）町に戻れる', () => {
    let state = makeState();
    state = applyAction(state, { type: 'town/go', dest: 'dungeon' }).state;
    state = walkToCamp(state);
    state = applyAction(state, { type: 'camp/sleep' }).state; // 深度2へ
    state = walkToCamp(state);

    state = applyAction(state, { type: 'dungeon/retreat' }).state;
    expect(state.life!.scene).toBe('retreat');
    expect(state.life!.dungeon!.retreatFloorsLeft).toBe(2);

    for (let i = 0; i < 50 && state.life!.scene !== 'town'; i++) {
      if (state.life!.scene === 'combat') {
        state = applyAction(state, { type: 'combat/attack' }).state;
      } else {
        state = applyAction(state, { type: 'retreat/step' }).state;
      }
    }
    expect(state.life!.scene).toBe('town');
    expect(state.life!.dungeon).toBeUndefined();
  });

  it('帰還の巻物でダンジョンから即座に町へ戻れる', () => {
    let state = makeState({}, {});
    state.life!.character.items = { returnScroll: 1 };
    state = applyAction(state, { type: 'town/go', dest: 'dungeon' }).state;

    // 常設行動にアイテム使用と「歩いて引き返す」が出ている
    const persistent = getPersistentActions(state);
    expect(persistent.some((b) => b.action.type === 'dungeon/useItem')).toBe(true);
    expect(persistent.some((b) => b.action.type === 'dungeon/retreat')).toBe(true);

    state = applyAction(state, { type: 'dungeon/useItem', itemId: 'returnScroll' }).state;
    expect(state.life!.scene).toBe('town');
    expect(state.life!.dungeon).toBeUndefined();
    expect(state.life!.character.items.returnScroll).toBe(0);
  });

  it('町や戦闘中には常設行動が出ない', () => {
    const town = makeState();
    expect(getPersistentActions(town)).toEqual([]);
  });
});

describe('戦闘での死と転生', () => {
  it('戦闘で死ぬと死因つきで人生が終わり、転生できる', () => {
    const brutal: EnemyInstance = {
      defId: 'orc',
      hp: 9999,
      maxHp: 9999,
      attack: 999,
      defense: 999,
      agility: 999,
      goldMin: 1,
      goldMax: 1,
    };
    let state = makeState(
      { maxHp: 10, hp: 10, strength: 1, agility: 1 },
      {
        scene: 'combat',
        dungeon: { depth: 1, nodes: generateFloor(createRng(1)), currentNodeId: 0 },
        combat: { enemy: brutal, menu: 'main', context: 'node' },
      },
    );

    state = applyAction(state, { type: 'combat/attack' }).state;
    expect(state.life!.alive).toBe(false);
    expect(state.life!.deathCause).toBe('battle');
    expect(state.life!.scene).toBe('death');
    expect(state.life!.dungeon).toBeUndefined();
    expect(state.life!.combat).toBeUndefined();

    // 死んだら「来世へ」しか選べない
    const choices = getChoices(state);
    expect(choices.map((b) => b.action.type)).toEqual(['death/reincarnate']);

    const reborn = applyAction(state, { type: 'death/reincarnate' }).state;
    expect(reborn.phase).toBe('creation');
    expect(reborn.meta.totalDeaths).toBe(1);
  });

  it('逃走に成功すると戦闘から離脱できる', () => {
    const weak: EnemyInstance = {
      defId: 'slime',
      hp: 9999,
      maxHp: 9999,
      attack: 1,
      defense: 999,
      agility: 1,
      goldMin: 1,
      goldMax: 1,
    };
    let state = makeState(
      { agility: 99, luck: 99 }, // 逃走成功率は上限（90%）になる
      {
        scene: 'combat',
        dungeon: { depth: 1, nodes: generateFloor(createRng(2)), currentNodeId: 0 },
        combat: { enemy: weak, menu: 'main', context: 'node' },
      },
    );
    for (let i = 0; i < 100 && state.life!.scene === 'combat'; i++) {
      state = applyAction(state, { type: 'combat/flee' }).state;
    }
    expect(state.life!.alive).toBe(true);
    expect(state.life!.scene).toBe('dungeon');
    expect(state.life!.combat).toBeUndefined();
  });

  it('野営地で眠っている間に寿命が尽きることがある（老衰死）', () => {
    let state = makeState(
      {},
      {
        lifespanYears: 19,
        scene: 'camp',
        dungeon: { depth: 1, nodes: generateFloor(createRng(3)), currentNodeId: 0 },
      },
    );
    state.life!.character.ageYears = 18.5;
    state = applyAction(state, { type: 'camp/sleep' }).state; // 年齢コスト1で寿命19歳を越える
    expect(state.life!.alive).toBe(false);
    expect(state.life!.deathCause).toBe('oldAge');
    expect(state.life!.dungeon).toBeUndefined();
  });
});
