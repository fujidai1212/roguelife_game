import { balance } from '../data/balance';
import { items } from '../data/items';
import { rumors } from '../data/rumors';
import { creationTexts } from '../data/texts/creation';
import { townTexts } from '../data/texts/town';
import { advanceAge } from './aging';
import { applyCombatAction } from './combatActions';
import { rollLifespan, rollStartingGold, rollStats } from './creation';
import { applyDungeonAction, enterDungeon } from './dungeonActions';
import { noop, requireLife } from './helpers';
import { restoreRng, type Rng } from './rng';
import type { ActionResult, GameAction, GameState, LifeState, TownDest } from './types';

/** 実装済みの町の施設。それ以外は「未実装」表示になる */
const implementedDests: TownDest[] = ['tavern', 'itemShop', 'work', 'dungeon'];

/** 新しいゲーム（キャラ作成から）を開始する */
export function newGame(seed: number): ActionResult {
  const rng = restoreRng(seed);
  return startCreation({ phase: 'creation', meta: { souls: 0, unlockedJobs: ['jobless'], totalDeaths: 0 }, rngState: rng.getState() }, rng);
}

function startCreation(base: GameState, rng: Rng): ActionResult {
  const stats = rollStats(rng);
  const state: GameState = {
    ...base,
    phase: 'creation',
    creation: { step: 'stats', stats, rerollCount: 0 },
    life: undefined,
    rngState: rng.getState(),
  };
  return { state, logs: [creationTexts.intro, creationTexts.statsLine(stats)] };
}

/**
 * ゲーム進行の中核。純粋関数: 同じ state と action からは必ず同じ結果になる
 * （乱数の状態も state に含まれるため）。
 */
export function applyAction(state: GameState, action: GameAction): ActionResult {
  const rng = restoreRng(state.rngState);

  switch (action.type) {
    case 'creation/reroll': {
      if (state.phase !== 'creation' || state.creation?.step !== 'stats') return noop(state);
      if (state.creation.rerollCount >= balance.creation.rerollMax) return noop(state);
      const stats = rollStats(rng);
      return {
        state: {
          ...state,
          creation: { ...state.creation, stats, rerollCount: state.creation.rerollCount + 1 },
          rngState: rng.getState(),
        },
        logs: [creationTexts.rerolled, creationTexts.statsLine(stats)],
      };
    }

    case 'creation/confirmStats': {
      if (state.phase !== 'creation' || state.creation?.step !== 'stats') return noop(state);
      return {
        state: { ...state, creation: { ...state.creation, step: 'job' } },
        logs: [creationTexts.jobPrompt],
      };
    }

    case 'creation/chooseJob': {
      const c = state.creation;
      if (state.phase !== 'creation' || c?.step !== 'job' || !c.stats) return noop(state);
      const gold = rollStartingGold(rng);
      const startAge = balance.creation.startAge;
      const life: LifeState = {
        character: {
          jobId: action.jobId,
          stats: c.stats,
          ageYears: startAge,
          gold,
          items: {},
        },
        lifespanYears: rollLifespan(rng),
        scene: 'town',
        alive: true,
      };
      return {
        state: { ...state, phase: 'life', creation: undefined, life, rngState: rng.getState() },
        logs: [creationTexts.jobChosen, creationTexts.lifeStart(startAge, gold), townTexts.hub],
      };
    }

    case 'town/go': {
      const life = requireLife(state, 'town');
      if (!life) return noop(state);
      if (!implementedDests.includes(action.dest)) {
        return { state, logs: [townTexts.notImplemented] };
      }
      if (action.dest === 'dungeon') return enterDungeon(state, life, rng);
      if (action.dest === 'tavern') return moveTo(state, life, 'tavern', townTexts.tavern.enter);
      if (action.dest === 'itemShop') return moveTo(state, life, 'itemShop', townTexts.shop.enter);
      return moveTo(state, life, 'work', townTexts.work.enter);
    }

    case 'tavern/rumor': {
      const life = requireLife(state, 'tavern');
      if (!life) return noop(state);
      const price = balance.tavern.rumorPrice;
      if (life.character.gold < price) {
        return { state, logs: [townTexts.tavern.noMoney] };
      }
      const rumor = rng.pick(rumors);
      const paid: LifeState = {
        ...life,
        character: { ...life.character, gold: life.character.gold - price },
      };
      const advanced = advanceAge(paid, balance.ageCosts.tavernRumor);
      return {
        state: { ...state, life: advanced.life, rngState: rng.getState() },
        logs: [townTexts.tavern.rumorHeard(rumor, price), ...advanced.logs],
      };
    }

    case 'work/labor': {
      const life = requireLife(state, 'work');
      if (!life) return noop(state);
      const w = balance.work;
      const years = action.years;
      if (!(w.durationChoicesYears as readonly number[]).includes(years)) return noop(state);
      // 年あたり報酬は契約が長いほど逓増する（リターンはコストに比例: セクション3.1）
      const payPerYear = rng.int(w.payPerYearMin, w.payPerYearMax);
      const efficiency = 1 + w.efficiencyBonusPerExtraYear * (years - 1);
      const pay = Math.round(payPerYear * years * efficiency);
      const paid: LifeState = {
        ...life,
        character: { ...life.character, gold: life.character.gold + pay },
      };
      const advanced = advanceAge(paid, years);
      return {
        state: { ...state, life: advanced.life, rngState: rng.getState() },
        logs: [townTexts.work.worked(years, pay), ...advanced.logs],
      };
    }

    case 'shop/buy': {
      const life = requireLife(state, 'itemShop');
      if (!life) return noop(state);
      const item = items[action.itemId];
      if (life.character.gold < item.price) {
        return { state, logs: [townTexts.shop.noMoney(item.name)] };
      }
      const owned = life.character.items[item.id] ?? 0;
      const bought: LifeState = {
        ...life,
        character: {
          ...life.character,
          gold: life.character.gold - item.price,
          items: { ...life.character.items, [item.id]: owned + 1 },
        },
      };
      return {
        state: { ...state, life: bought },
        logs: [townTexts.shop.bought(item.name, item.price)],
      };
    }

    case 'scene/backToTown': {
      const life = requireLife(state);
      // 「店を出る」系のボタンからのみ使う。ダンジョン内からの帰還は別アクション
      if (!life || !['tavern', 'itemShop', 'work'].includes(life.scene)) return noop(state);
      return moveTo(state, life, 'town', townTexts.backToTown, townTexts.hub);
    }

    case 'death/reincarnate': {
      const life = state.life;
      if (state.phase !== 'life' || !life || life.alive) return noop(state);
      const meta = { ...state.meta, totalDeaths: state.meta.totalDeaths + 1 };
      return startCreation({ ...state, meta }, rng);
    }

    case 'dungeon/advance':
    case 'dungeon/chest':
    case 'dungeon/fountain':
    case 'dungeon/useItem':
    case 'dungeon/retreat':
    case 'retreat/step':
    case 'camp/sleep':
    case 'camp/rest':
      return applyDungeonAction(state, action, rng);

    case 'combat/attack':
    case 'combat/itemsOpen':
    case 'combat/itemsClose':
    case 'combat/useItem':
    case 'combat/flee':
      return applyCombatAction(state, action, rng);
  }
}

function moveTo(
  state: GameState,
  life: LifeState,
  scene: LifeState['scene'],
  ...logs: string[]
): ActionResult {
  return { state: { ...state, life: { ...life, scene } }, logs };
}
