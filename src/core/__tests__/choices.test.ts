import { describe, expect, it } from 'vitest';

import { balance } from '../../data/balance';
import { applyAction, newGame } from '../actions';
import { getChoices } from '../choices';
import type { GameState } from '../types';

function startLife(seed = 1): GameState {
  let state = newGame(seed).state;
  state = applyAction(state, { type: 'creation/confirmStats' }).state;
  state = applyAction(state, { type: 'creation/chooseJob', jobId: 'jobless' }).state;
  return state;
}

describe('getChoices: 場面ごとの選択肢', () => {
  it('キャラ作成の各ステップで選択肢が出る', () => {
    const { state } = newGame(1);
    expect(getChoices(state).map((b) => b.action.type)).toEqual([
      'creation/reroll',
      'creation/confirmStats',
    ]);

    const job = applyAction(state, { type: 'creation/confirmStats' }).state;
    expect(getChoices(job).map((b) => b.action.type)).toEqual(['creation/chooseJob']);
  });

  it('振り直しボタンは残り回数を表示し、使い切ると無効になる', () => {
    let state = newGame(1).state;
    const reroll = () => getChoices(state).find((b) => b.choice.id === 'reroll')!.choice;
    expect(reroll().label).toContain(String(balance.creation.rerollMax));
    expect(reroll().disabled).toBeFalsy();

    for (let i = 0; i < balance.creation.rerollMax; i++) {
      state = applyAction(state, { type: 'creation/reroll' }).state;
    }
    expect(reroll().label).toContain('0');
    expect(reroll().disabled).toBe(true);
  });

  it('町のハブでは8つの行き先が出る（画面の8スロットに収まる）', () => {
    const bindings = getChoices(startLife());
    expect(bindings).toHaveLength(8);
    expect(bindings.every((b) => b.action.type === 'town/go')).toBe(true);
  });

  it('働き口では契約年数の選択肢＋戻るが出る', () => {
    const state = startLife();
    const inWork = applyAction(state, { type: 'town/go', dest: 'work' }).state;
    const bindings = getChoices(inWork);
    expect(bindings).toHaveLength(balance.work.durationChoicesYears.length + 1);
    const laborYears = bindings
      .filter((b) => b.action.type === 'work/labor')
      .map((b) => (b.action.type === 'work/labor' ? b.action.years : 0));
    expect(laborYears).toEqual([...balance.work.durationChoicesYears]);
  });

  it('どの場面でも選択肢は8個以内で、IDが重複しない', () => {
    let state = startLife();
    for (const dest of ['tavern', 'itemShop', 'work'] as const) {
      const inScene = applyAction(state, { type: 'town/go', dest }).state;
      const bindings = getChoices(inScene);
      expect(bindings.length).toBeGreaterThan(0);
      expect(bindings.length).toBeLessThanOrEqual(8);
      const ids = bindings.map((b) => b.choice.id);
      expect(new Set(ids).size).toBe(ids.length);
      state = applyAction(inScene, { type: 'scene/backToTown' }).state;
    }
  });
});
