import { describe, expect, it } from 'vitest';

import { balance } from '../../data/balance';
import { items } from '../../data/items';
import { applyAction, newGame } from '../actions';
import type { GameState } from '../types';

/** キャラ作成を最後まで進めて人生を開始した状態を作る */
function startLife(seed = 1): GameState {
  let state = newGame(seed).state;
  state = applyAction(state, { type: 'creation/confirmStats' }).state;
  state = applyAction(state, { type: 'creation/confirmAge' }).state;
  state = applyAction(state, { type: 'creation/chooseJob', jobId: 'jobless' }).state;
  return state;
}

describe('キャラ作成フロー', () => {
  it('newGame はステータスロール画面から始まる', () => {
    const { state, logs } = newGame(1);
    expect(state.phase).toBe('creation');
    expect(state.creation?.step).toBe('stats');
    expect(state.creation?.stats).toBeDefined();
    expect(logs.length).toBeGreaterThan(0);
  });

  it('振り直しでステータスが変わり、回数が記録される', () => {
    const { state } = newGame(1);
    const rerolled = applyAction(state, { type: 'creation/reroll' }).state;
    expect(rerolled.creation?.rerollCount).toBe(1);
    expect(rerolled.creation?.stats).not.toEqual(state.creation?.stats);
  });

  it('確定 → 年齢 → 職業選択で人生が始まる', () => {
    const state = startLife();
    expect(state.phase).toBe('life');
    expect(state.creation).toBeUndefined();
    const life = state.life!;
    expect(life.alive).toBe(true);
    expect(life.scene).toBe('town');
    expect(life.character.jobId).toBe('jobless');
    expect(life.character.ageYears).toBeGreaterThanOrEqual(balance.creation.ageMin);
    expect(life.character.gold).toBeGreaterThan(0);
    expect(life.lifespanYears).toBeGreaterThanOrEqual(balance.aging.lifespanBase);
  });

  it('同じシードからは同じ人生が始まる（純粋関数）', () => {
    expect(startLife(7)).toEqual(startLife(7));
  });
});

describe('町のアクション', () => {
  it('日雇い労働で金が増え、1日経過する', () => {
    let state = startLife();
    const goldBefore = state.life!.character.gold;
    state = applyAction(state, { type: 'town/go', dest: 'work' }).state;
    state = applyAction(state, { type: 'work/labor' }).state;
    const earned = state.life!.character.gold - goldBefore;
    expect(earned).toBeGreaterThanOrEqual(balance.work.dayLaborPayMin);
    expect(earned).toBeLessThanOrEqual(balance.work.dayLaborPayMax);
    expect(state.life!.daysElapsed).toBe(1);
  });

  it('道具屋で買うと金が減り、アイテムが増える', () => {
    let state = startLife();
    const goldBefore = state.life!.character.gold;
    state = applyAction(state, { type: 'town/go', dest: 'itemShop' }).state;
    state = applyAction(state, { type: 'shop/buy', itemId: 'herb' }).state;
    expect(state.life!.character.gold).toBe(goldBefore - items.herb.price);
    expect(state.life!.character.items.herb).toBe(1);
  });

  it('金が足りないと買えない（初期資金では帰還の巻物は買えない）', () => {
    let state = startLife();
    state = applyAction(state, { type: 'town/go', dest: 'itemShop' }).state;
    const goldBefore = state.life!.character.gold;
    expect(goldBefore).toBeLessThan(items.returnScroll.price);
    const result = applyAction(state, { type: 'shop/buy', itemId: 'returnScroll' });
    expect(result.state.life!.character.gold).toBe(goldBefore);
    expect(result.state.life!.character.items.returnScroll).toBeUndefined();
  });

  it('酒場で噂を聞くと酒代が減り、1日経過する', () => {
    let state = startLife();
    const goldBefore = state.life!.character.gold;
    state = applyAction(state, { type: 'town/go', dest: 'tavern' }).state;
    const { state: after, logs } = applyAction(state, { type: 'tavern/rumor' });
    expect(after.life!.character.gold).toBe(goldBefore - balance.tavern.rumorPrice);
    expect(after.life!.daysElapsed).toBe(1);
    expect(logs.length).toBeGreaterThan(0);
  });

  it('未実装の行き先へは移動できず、その場に留まる', () => {
    const state = startLife();
    const result = applyAction(state, { type: 'town/go', dest: 'guild' });
    expect(result.state.life!.scene).toBe('town');
    expect(result.logs.length).toBeGreaterThan(0);
  });

  it('場面が合わないアクションは何も起こさない（多重タップ対策）', () => {
    const state = startLife(); // scene は town
    const result = applyAction(state, { type: 'work/labor' });
    expect(result.state).toBe(state);
    expect(result.logs).toEqual([]);
  });
});

describe('通しプレイ: 労働し続けて老衰死 → 転生', () => {
  it('働き続けるといつか老衰死し、転生で次のキャラ作成が始まる', () => {
    let state = startLife();
    state = applyAction(state, { type: 'town/go', dest: 'work' }).state;

    // 寿命は最長でも lifespanBase + lifespanRandomMax 歳。それに足る日数だけ働く
    const maxDays =
      (balance.aging.lifespanBase + balance.aging.lifespanRandomMax) * balance.time.daysPerYear;
    for (let i = 0; i < maxDays && state.life!.alive; i++) {
      state = applyAction(state, { type: 'work/labor' }).state;
    }

    expect(state.life!.alive).toBe(false);
    expect(state.life!.deathCause).toBe('oldAge');
    expect(state.life!.scene).toBe('death');
    expect(state.life!.character.ageYears).toBeGreaterThanOrEqual(balance.aging.lifespanBase);

    // 死後は労働できない
    const afterDeath = applyAction(state, { type: 'work/labor' });
    expect(afterDeath.state).toBe(state);

    // 転生すると死亡数が増え、新しいキャラ作成が始まる
    const reborn = applyAction(state, { type: 'death/reincarnate' }).state;
    expect(reborn.phase).toBe('creation');
    expect(reborn.creation?.step).toBe('stats');
    expect(reborn.meta.totalDeaths).toBe(1);
  });
});
