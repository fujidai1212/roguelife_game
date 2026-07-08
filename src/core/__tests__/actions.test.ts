import { describe, expect, it } from 'vitest';

import { balance } from '../../data/balance';
import { items } from '../../data/items';
import { applyAction, newGame } from '../actions';
import type { GameState } from '../types';

/** キャラ作成を最後まで進めて人生を開始した状態を作る */
function startLife(seed = 1): GameState {
  let state = newGame(seed).state;
  state = applyAction(state, { type: 'creation/confirmStats' }).state;
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

  it('振り直しは rerollMax 回まで。それ以降は何も起きない', () => {
    let state = newGame(1).state;
    for (let i = 0; i < balance.creation.rerollMax; i++) {
      state = applyAction(state, { type: 'creation/reroll' }).state;
    }
    expect(state.creation?.rerollCount).toBe(balance.creation.rerollMax);
    const blocked = applyAction(state, { type: 'creation/reroll' });
    expect(blocked.state).toBe(state);
    expect(blocked.logs).toEqual([]);
  });

  it('確定 → 職業選択で18歳の人生が始まる', () => {
    const state = startLife();
    expect(state.phase).toBe('life');
    expect(state.creation).toBeUndefined();
    const life = state.life!;
    expect(life.alive).toBe(true);
    expect(life.scene).toBe('town');
    expect(life.character.jobId).toBe('jobless');
    expect(life.character.ageYears).toBe(balance.creation.startAge);
    expect(life.character.gold).toBeGreaterThan(0);
    expect(life.lifespanYears).toBeGreaterThanOrEqual(balance.aging.lifespanBase);
  });

  it('同じシードからは同じ人生が始まる（純粋関数）', () => {
    expect(startLife(7)).toEqual(startLife(7));
  });
});

describe('町のアクション', () => {
  const w = balance.work;

  it('1年働くと金が増え、1歳老いる', () => {
    let state = startLife();
    const goldBefore = state.life!.character.gold;
    state = applyAction(state, { type: 'town/go', dest: 'work' }).state;
    state = applyAction(state, { type: 'work/labor', years: 1 }).state;
    const earned = state.life!.character.gold - goldBefore;
    expect(earned).toBeGreaterThanOrEqual(w.payPerYearMin);
    expect(earned).toBeLessThanOrEqual(w.payPerYearMax);
    expect(state.life!.character.ageYears).toBe(balance.creation.startAge + 1);
  });

  it('長期契約ほど年あたり報酬が逓増する', () => {
    const years = 10;
    let state = startLife();
    const goldBefore = state.life!.character.gold;
    state = applyAction(state, { type: 'town/go', dest: 'work' }).state;
    state = applyAction(state, { type: 'work/labor', years }).state;
    const earned = state.life!.character.gold - goldBefore;
    const efficiency = 1 + w.efficiencyBonusPerExtraYear * (years - 1);
    expect(earned).toBeGreaterThanOrEqual(Math.round(w.payPerYearMin * years * efficiency));
    expect(earned).toBeLessThanOrEqual(Math.round(w.payPerYearMax * years * efficiency));
    expect(state.life!.character.ageYears).toBe(balance.creation.startAge + years);
  });

  it('選択肢にない契約年数は無効（何も起きない）', () => {
    let state = startLife();
    state = applyAction(state, { type: 'town/go', dest: 'work' }).state;
    const result = applyAction(state, { type: 'work/labor', years: 2 });
    expect(result.state).toBe(state);
    expect(result.logs).toEqual([]);
  });

  it('道具屋で買うと金が減り、アイテムが増える（年齢コストなし）', () => {
    let state = startLife();
    const goldBefore = state.life!.character.gold;
    state = applyAction(state, { type: 'town/go', dest: 'itemShop' }).state;
    state = applyAction(state, { type: 'shop/buy', itemId: 'herb' }).state;
    expect(state.life!.character.gold).toBe(goldBefore - items.herb.price);
    expect(state.life!.character.items.herb).toBe(1);
    expect(state.life!.character.ageYears).toBe(balance.creation.startAge);
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

  it('酒場で噂を聞くと酒代が減り、わずかに老いる', () => {
    let state = startLife();
    const goldBefore = state.life!.character.gold;
    state = applyAction(state, { type: 'town/go', dest: 'tavern' }).state;
    const { state: after, logs } = applyAction(state, { type: 'tavern/rumor' });
    expect(after.life!.character.gold).toBe(goldBefore - balance.tavern.rumorPrice);
    expect(after.life!.character.ageYears).toBe(
      balance.creation.startAge + balance.ageCosts.tavernRumor,
    );
    expect(logs.length).toBeGreaterThan(0);
  });

  it('未実装の行き先へは移動できず、その場に留まる', () => {
    const state = startLife();
    const result = applyAction(state, { type: 'town/go', dest: 'weaponShop' });
    expect(result.state.life!.scene).toBe('town');
    expect(result.logs.length).toBeGreaterThan(0);
  });

  it('場面が合わないアクションは何も起こさない（多重タップ対策）', () => {
    const state = startLife(); // scene は town
    const result = applyAction(state, { type: 'work/labor', years: 1 });
    expect(result.state).toBe(state);
    expect(result.logs).toEqual([]);
  });
});

describe('通しプレイ: 働き続けて老衰死 → 転生', () => {
  it('年齢を消費し続けるといつか老衰死し、転生で次のキャラ作成が始まる', () => {
    let state = startLife();
    state = applyAction(state, { type: 'town/go', dest: 'work' }).state;

    // 寿命は最長 lifespanBase + lifespanRandomMax 歳。10年契約を繰り返せば必ず届く
    const maxContracts = Math.ceil(
      (balance.aging.lifespanBase + balance.aging.lifespanRandomMax) / 10,
    );
    for (let i = 0; i < maxContracts && state.life!.alive; i++) {
      state = applyAction(state, { type: 'work/labor', years: 10 }).state;
    }

    expect(state.life!.alive).toBe(false);
    expect(state.life!.deathCause).toBe('oldAge');
    expect(state.life!.scene).toBe('death');
    expect(state.life!.character.ageYears).toBe(state.life!.lifespanYears);

    // 死後は労働できない
    const afterDeath = applyAction(state, { type: 'work/labor', years: 10 });
    expect(afterDeath.state).toBe(state);

    // 転生すると死亡数が増え、新しいキャラ作成が始まる
    const reborn = applyAction(state, { type: 'death/reincarnate' }).state;
    expect(reborn.phase).toBe('creation');
    expect(reborn.creation?.step).toBe('stats');
    expect(reborn.meta.totalDeaths).toBe(1);
  });
});
