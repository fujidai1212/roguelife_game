import { describe, expect, it } from 'vitest';

import { balance } from '../../data/balance';
import { quests } from '../../data/quests';
import { underworldJobs } from '../../data/underworld';
import { applyAction } from '../actions';
import { getChoices } from '../choices';
import { generateFloor, createEnemyInstanceById } from '../dungeon';
import { stealSuccessChance } from '../helpers';
import { createRng } from '../rng';
import { settleLife } from '../souls';
import type { GameState, LifeState, Stats } from '../types';

function makeState(
  lifeOverrides: Partial<LifeState> = {},
  statOverrides: Partial<Stats> = {},
  seed = 1,
): GameState {
  const stats: Stats = {
    maxHp: 100,
    hp: 100,
    strength: 30,
    agility: 10,
    magic: 10,
    luck: 10,
    ...statOverrides,
  };
  return {
    phase: 'life',
    life: {
      character: { jobId: 'jobless', stats, ageYears: 20, gold: 200, items: {} },
      lifespanYears: 75,
      scene: 'town',
      alive: true,
      kills: 0,
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
      bestDepth: 0,
    },
    rngState: seed,
  };
}

/** 多数のシードで同じアクションを実行し、観測された結果を集める */
function outcomesOverSeeds(
  build: (seed: number) => GameState,
  act: (state: GameState) => GameState,
  classify: (state: GameState) => string,
  seeds = 60,
): Set<string> {
  const seen = new Set<string>();
  for (let seed = 0; seed < seeds; seed++) {
    seen.add(classify(act(build(seed))));
  }
  return seen;
}

describe('盗み（道具屋）', () => {
  it('成功率は素早さ・運・盗賊補正で上がり、高い品ほど下がる', () => {
    const base = makeState().life!;
    const nimble = makeState({}, { agility: 30, luck: 30 }).life!;
    const thief: LifeState = { ...base, character: { ...base.character, jobId: 'thief' } };
    expect(stealSuccessChance(nimble, 10)).toBeGreaterThan(stealSuccessChance(base, 10));
    expect(stealSuccessChance(thief, 10)).toBeGreaterThan(stealSuccessChance(base, 10));
    expect(stealSuccessChance(base, 200)).toBeLessThan(stealSuccessChance(base, 10));
  });

  it('結果は「入手 / 牢屋 / 用心棒と戦闘」のいずれかで、全パターンが起こりうる', () => {
    const seen = outcomesOverSeeds(
      (seed) => makeState({ scene: 'itemShop' }, {}, seed),
      (s) => applyAction(s, { type: 'shop/steal', itemId: 'herb' }).state,
      (s) => {
        const life = s.life!;
        if (life.scene === 'itemShop' && (life.character.items.herb ?? 0) > 0) return 'success';
        if (life.scene === 'jail') return 'jail';
        if (life.scene === 'combat') return 'fight';
        return `unexpected:${life.scene}`;
      },
    );
    expect([...seen].every((o) => ['success', 'jail', 'fight'].includes(o))).toBe(true);
    expect(seen.size).toBe(3);
  });

  it('用心棒との戦闘に勝つと町に戻る', () => {
    let state = makeState(
      {
        scene: 'combat',
        combat: { enemy: createEnemyInstanceById('guard', 1), menu: 'main', context: 'town' },
      },
      { strength: 999, agility: 999 },
    );
    state = applyAction(state, { type: 'combat/attack' }).state;
    expect(state.life!.scene).toBe('town');
    expect(state.life!.alive).toBe(true);
  });
});

describe('牢屋と脱獄', () => {
  it('刑期を務めると年齢を消費して町に戻る', () => {
    let state = makeState({ scene: 'jail' });
    state = applyAction(state, { type: 'jail/serve' }).state;
    expect(state.life!.scene).toBe('town');
    expect(state.life!.character.ageYears).toBe(20 + balance.jail.sentenceYears);
  });

  it('脱獄は成功（町へ）か死のどちらかで、両方起こりうる', () => {
    const seen = outcomesOverSeeds(
      (seed) => makeState({ scene: 'jail' }, {}, seed),
      (s) => applyAction(s, { type: 'jail/escape' }).state,
      (s) => (s.life!.alive ? s.life!.scene : `dead:${s.life!.deathCause}`),
    );
    expect(seen).toEqual(new Set(['town', 'dead:jail']));
  });

  it('脱獄死でも魂精算が走る', () => {
    for (let seed = 0; seed < 60; seed++) {
      const state = makeState({ scene: 'jail', maxDepth: 3 }, {}, seed);
      const after = applyAction(state, { type: 'jail/escape' }).state;
      if (!after.life!.alive) {
        expect(after.life!.settlement).toBeDefined();
        expect(after.meta.souls).toBeGreaterThan(0);
        return;
      }
    }
    throw new Error('no death observed');
  });
});

describe('裏稼業', () => {
  it('裏路地には全ての稼業＋戻るが並ぶ（マスターデータ駆動）', () => {
    const state = makeState({ scene: 'alley' });
    expect(getChoices(state)).toHaveLength(underworldJobs.length + 1);
  });

  it('結果は「報酬 / 牢屋 / 死」のいずれかで、全パターンが起こりうる', () => {
    const goldBefore = 200;
    const seen = outcomesOverSeeds(
      (seed) => makeState({ scene: 'alley' }, {}, seed),
      (s) => applyAction(s, { type: 'alley/job', jobId: 'assassination' }).state,
      (s) => {
        const life = s.life!;
        if (!life.alive) return `dead:${life.deathCause}`;
        if (life.scene === 'jail') return 'jail';
        if (life.scene === 'alley' && life.character.gold > goldBefore) return 'paid';
        return `unexpected:${life.scene}`;
      },
    );
    expect(seen).toEqual(new Set(['paid', 'jail', 'dead:underworld']));
  });

  it('存在しない稼業IDは何も起こさない', () => {
    const state = makeState({ scene: 'alley' });
    expect(applyAction(state, { type: 'alley/job', jobId: 'nope' }).state).toBe(state);
  });
});

describe('酒場のギャンブル', () => {
  it('カードは勝てば倍、負ければ没収', () => {
    const g = balance.gamble;
    const bet = g.cardBets[0];
    const seen = outcomesOverSeeds(
      (seed) => makeState({ scene: 'tavern' }, {}, seed),
      (s) => applyAction(s, { type: 'tavern/cards', bet }).state,
      (s) => String(s.life!.character.gold - 200),
    );
    expect(seen).toEqual(new Set([String(bet * (g.cardPayoutMultiplier - 1)), String(-bet)]));
  });

  it('掛け金の選択肢にない額は無効', () => {
    const state = makeState({ scene: 'tavern' });
    expect(applyAction(state, { type: 'tavern/cards', bet: 9999 }).state).toBe(state);
  });

  it('ロシアンルーレットは大金か死かで、両方起こりうる', () => {
    const g = balance.gamble;
    const seen = outcomesOverSeeds(
      (seed) => makeState({ scene: 'tavern' }, {}, seed),
      (s) => applyAction(s, { type: 'tavern/roulette' }).state,
      (s) =>
        s.life!.alive
          ? String(s.life!.character.gold - 200)
          : `dead:${s.life!.deathCause}`,
    );
    expect(seen).toEqual(
      new Set([String(g.rouletteBet * (g.roulettePayoutMultiplier - 1)), 'dead:roulette']),
    );
  });
});

describe('ギルドのクエスト', () => {
  it('ギルドに入ると依頼が提示され、受注できる', () => {
    let state = makeState();
    state = applyAction(state, { type: 'town/go', dest: 'guild' }).state;
    const quest = state.life!.quest;
    expect(quest).toBeDefined();
    expect(quest!.accepted).toBe(false);
    state = applyAction(state, { type: 'guild/accept' }).state;
    expect(state.life!.quest!.accepted).toBe(true);
  });

  it('討伐クエスト: 対象を倒すと進捗が進み、達成報告で報酬', () => {
    const def = quests.find((q) => q.id === 'huntSlime')!;
    if (def.kind !== 'hunt') throw new Error('unexpected');
    let state = makeState(
      {
        scene: 'combat',
        quest: { questId: def.id, progress: def.count - 1, accepted: true },
        dungeon: { depth: 1, nodes: generateFloor(createRng(1)), currentNodeId: 0 },
        combat: { enemy: createEnemyInstanceById('slime', 1), menu: 'main', context: 'node' },
      },
      { strength: 999, agility: 999 },
    );
    state = applyAction(state, { type: 'combat/attack' }).state;
    expect(state.life!.quest!.progress).toBe(def.count);

    // 報告して報酬を得る
    const goldBefore = state.life!.character.gold;
    state = { ...state, life: { ...state.life!, scene: 'guild', dungeon: undefined } };
    state = applyAction(state, { type: 'guild/report' }).state;
    expect(state.life!.character.gold).toBe(goldBefore + def.reward);
    expect(state.life!.quest).toBeUndefined();
  });

  it('採取クエスト: アイテムが揃っていれば納品して報酬、足りなければ断られる', () => {
    const def = quests.find((q) => q.id === 'gatherHerb')!;
    if (def.kind !== 'gather') throw new Error('unexpected');
    const base = makeState({
      scene: 'guild',
      quest: { questId: def.id, progress: 0, accepted: true },
    });

    const notDone = applyAction(base, { type: 'guild/report' });
    expect(notDone.state.life!.quest).toBeDefined();

    const withHerbs: GameState = {
      ...base,
      life: {
        ...base.life!,
        character: { ...base.life!.character, items: { herb: def.count } },
      },
    };
    const done = applyAction(withHerbs, { type: 'guild/report' }).state;
    expect(done.life!.character.gold).toBe(200 + def.reward);
    expect(done.life!.character.items.herb).toBe(0);
    expect(done.life!.quest).toBeUndefined();
  });
});

describe('新しいダンジョン遭遇', () => {
  /** 指定した種類のノードだけを隣に持つダンジョン状態を作る */
  function makeDungeonWith(kind: 'trash' | 'merchant' | 'trap', seed: number): GameState {
    const nodes = generateFloor(createRng(1)).map((n) =>
      n.row === 1 ? { ...n, kind } : n,
    );
    return makeState(
      { scene: 'dungeon', dungeon: { depth: 1, nodes, currentNodeId: nodes[0].id } },
      {},
      seed,
    );
  }

  it('ゴミの山: 漁ると「アイテム / ダメージ / 何もない」のいずれか', () => {
    const seen = outcomesOverSeeds(
      (seed) => makeDungeonWith('trash', seed),
      (s) => {
        let state = applyAction(s, { type: 'dungeon/advance', nodeId: s.life!.dungeon!.nodes[0].edges[0] }).state;
        if (state.life!.dungeon?.pendingEvent !== 'trash') return state;
        return applyAction(state, { type: 'dungeon/trash', dig: true }).state;
      },
      (s) => {
        const life = s.life!;
        const itemCount = Object.values(life.character.items).reduce((a, b) => a + (b ?? 0), 0);
        if (itemCount > 0) return 'item';
        if (life.character.stats.hp < life.character.stats.maxHp) return 'hurt';
        return 'nothing';
      },
      80,
    );
    expect(seen).toEqual(new Set(['item', 'hurt', 'nothing']));
  });

  it('行商人: 割高で買える。盗みは成功か用心棒戦', () => {
    const buyState = makeDungeonWith('merchant', 3);
    let state = applyAction(buyState, {
      type: 'dungeon/advance',
      nodeId: buyState.life!.dungeon!.nodes[0].edges[0],
    }).state;
    expect(state.life!.dungeon!.pendingEvent).toBe('merchant');
    const goldBefore = state.life!.character.gold;
    state = applyAction(state, { type: 'dungeon/merchantBuy', itemId: 'herb' }).state;
    const paid = goldBefore - state.life!.character.gold;
    expect(paid).toBe(Math.round(10 * balance.dungeon.merchant.priceMarkup));

    const seen = outcomesOverSeeds(
      (seed) => makeDungeonWith('merchant', seed),
      (s) => {
        let st = applyAction(s, { type: 'dungeon/advance', nodeId: s.life!.dungeon!.nodes[0].edges[0] }).state;
        return applyAction(st, { type: 'dungeon/merchantSteal' }).state;
      },
      (s) => (s.life!.scene === 'combat' ? 'fight' : 'stolen'),
    );
    expect(seen).toEqual(new Set(['stolen', 'fight']));
  });

  it('罠: 踏むと「回避 / ダメージ」のいずれかが即時に起こる', () => {
    const seen = outcomesOverSeeds(
      (seed) => makeDungeonWith('trap', seed),
      (s) =>
        applyAction(s, { type: 'dungeon/advance', nodeId: s.life!.dungeon!.nodes[0].edges[0] })
          .state,
      (s) =>
        s.life!.character.stats.hp < s.life!.character.stats.maxHp ? 'hit' : 'avoided',
    );
    expect(seen).toEqual(new Set(['hit', 'avoided']));
  });

  it('金色のスライムを倒すと魂ボーナスが付き、精算でティア上限の外側に加算される', () => {
    let state = makeState(
      {
        scene: 'combat',
        dungeon: { depth: 1, nodes: generateFloor(createRng(1)), currentNodeId: 0 },
        combat: {
          enemy: createEnemyInstanceById('goldenSlime', 1),
          menu: 'main',
          context: 'node',
        },
      },
      { strength: 999, agility: 999 },
    );
    state = applyAction(state, { type: 'combat/attack' }).state;
    expect(state.life!.bonusSouls).toBe(balance.dungeon.rare.bonusSouls);

    // ティア0（上限5）でもボーナスは上乗せされる
    const dead: LifeState = {
      ...state.life!,
      alive: false,
      deathCause: 'battle',
      character: {
        ...state.life!.character,
        ageYears: 60,
        gold: 400,
      },
      maxDepth: 0,
      kills: 10,
    };
    const settlement = settleLife(dead);
    expect(settlement.tier).toBe(0);
    expect(settlement.souls).toBe(5 + balance.dungeon.rare.bonusSouls);
  });
});
