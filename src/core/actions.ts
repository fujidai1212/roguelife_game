import { balance } from '../data/balance';
import { items } from '../data/items';
import { jobs } from '../data/jobs';
import { rumors } from '../data/rumors';
import { creationTexts } from '../data/texts/creation';
import { soulTexts } from '../data/texts/souls';
import { townTexts } from '../data/texts/town';
import { advanceAge } from './aging';
import { applyCombatAction } from './combatActions';
import { applyJobBonus, applyStatBonus, rollLifespan, rollStartingGold, rollStats } from './creation';
import { applyDungeonAction, enterDungeon } from './dungeonActions';
import { noop, requireLife } from './helpers';
import { newlyUnlockedLegacies, shopPrice, startingBonuses } from './legacies';
import { restoreRng, type Rng } from './rng';
import { applyLifeEndToMeta, settleLife } from './souls';
import { applyTownRiskAction, enterGuild } from './townActions';
import type { ActionResult, GameAction, GameState, LifeState, MetaState, TownDest } from './types';

/** 実装済みの町の施設。それ以外は「未実装」表示になる */
const implementedDests: TownDest[] = [
  'tavern',
  'itemShop',
  'work',
  'church',
  'guild',
  'alley',
  'dungeon',
];

/** まっさらなメタ状態（初回起動時） */
export function initialMeta(): MetaState {
  return {
    souls: 0,
    unlockedJobs: ['jobless'],
    unlockedLegacies: [],
    totalDeaths: 0,
    totalKills: 0,
    totalMidBossKills: 0,
    totalBossKills: 0,
    bestDepth: 0,
  };
}

/** 新しいゲーム（キャラ作成から）を開始する。meta はセーブから引き継げる */
export function newGame(seed: number, meta: MetaState = initialMeta()): ActionResult {
  const rng = restoreRng(seed);
  return startCreation({ phase: 'creation', meta, rngState: rng.getState() }, rng);
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
 * アクションの結果、人生が終わっていたら魂精算とレガシー判定を自動で行う。
 */
export function applyAction(state: GameState, action: GameAction): ActionResult {
  return settleIfLifeEnded(state, applyActionInner(state, action));
}

/** 人生が「生存→終了」に変わった直後に一度だけ、魂精算・メタ更新・レガシー判定を行う */
function settleIfLifeEnded(before: GameState, result: ActionResult): ActionResult {
  const life = result.state.life;
  if (!before.life?.alive || !life || life.alive || life.settlement) return result;

  const settlement = settleLife(life);
  let meta = applyLifeEndToMeta(result.state.meta, life, settlement);
  const logs = [
    ...result.logs,
    soulTexts.settlement(soulTexts.tierNames[settlement.tier], settlement.souls, meta.souls),
  ];
  for (const legacy of newlyUnlockedLegacies(meta)) {
    meta = { ...meta, unlockedLegacies: [...meta.unlockedLegacies, legacy.id] };
    logs.push(soulTexts.legacyUnlocked(legacy.name, legacy.description));
  }
  return { state: { ...result.state, meta, life: { ...life, settlement } }, logs };
}

function applyActionInner(state: GameState, action: GameAction): ActionResult {
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
      // 各職業の説明（スキルの有無を含む）もログに出す
      const jobLines = Object.values(jobs).map((job) =>
        creationTexts.jobLine(job.name, job.description),
      );
      return {
        state: { ...state, creation: { ...state.creation, step: 'job' } },
        logs: [creationTexts.jobPrompt(state.meta.souls), ...jobLines],
      };
    }

    case 'creation/chooseJob': {
      const c = state.creation;
      if (state.phase !== 'creation' || c?.step !== 'job' || !c.stats) return noop(state);
      const job = jobs[action.jobId];
      let meta = state.meta;
      const logs: string[] = [];

      // 未解放の職業は魂を消費して解放する（以後の来世でも選べる）
      if (!meta.unlockedJobs.includes(job.id)) {
        if (meta.souls < job.unlockCost) return noop(state);
        meta = {
          ...meta,
          souls: meta.souls - job.unlockCost,
          unlockedJobs: [...meta.unlockedJobs, job.id],
        };
        logs.push(creationTexts.jobUnlocked(job.name, job.unlockCost));
      }

      const bonuses = startingBonuses(meta);
      const gold = rollStartingGold(rng) + bonuses.gold;
      const startAge = balance.creation.startAge;
      const life: LifeState = {
        character: {
          jobId: job.id,
          // 職業補正に加えて、レガシーのステータス補正（来世への恩恵）を乗せる
          stats: applyStatBonus(applyJobBonus(c.stats, job), bonuses.stats),
          ageYears: startAge,
          gold,
          items: { ...bonuses.items },
        },
        lifespanYears: rollLifespan(rng),
        scene: 'town',
        alive: true,
        kills: 0,
        midBossKills: 0,
        bossKills: 0,
        maxDepth: 0,
        bonusSouls: 0,
      };
      logs.push(creationTexts.jobChosen[job.id], creationTexts.lifeStart(startAge, gold), townTexts.hub);
      return {
        state: { ...state, phase: 'life', creation: undefined, life, meta, rngState: rng.getState() },
        logs,
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
      if (action.dest === 'church') return moveTo(state, life, 'church', townTexts.church.enter);
      if (action.dest === 'guild') return enterGuild(state, life, rng);
      if (action.dest === 'alley') return moveTo(state, life, 'alley', townTexts.alley.enter);
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
      const price = shopPrice(state.meta, item.price); // レガシーの割引を適用
      if (life.character.gold < price) {
        return { state, logs: [townTexts.shop.noMoney(item.name)] };
      }
      const owned = life.character.items[item.id] ?? 0;
      const bought: LifeState = {
        ...life,
        character: {
          ...life.character,
          gold: life.character.gold - price,
          items: { ...life.character.items, [item.id]: owned + 1 },
        },
      };
      return {
        state: { ...state, life: bought },
        logs: [townTexts.shop.bought(item.name, price)],
      };
    }

    case 'scene/backToTown': {
      const life = requireLife(state);
      // 「店を出る」系のボタンからのみ使う。ダンジョン内からの帰還は別アクション
      if (!life || !['tavern', 'itemShop', 'work', 'church', 'guild', 'alley'].includes(life.scene)) {
        return noop(state);
      }
      if (life.retireConfirm) return noop(state);
      return moveTo(state, life, 'town', townTexts.backToTown, townTexts.hub);
    }

    case 'retire/ask': {
      const life = requireLife(state);
      if (!life || (life.scene !== 'church' && life.scene !== 'guild') || life.retireConfirm) {
        return noop(state);
      }
      return {
        state: { ...state, life: { ...life, retireConfirm: true } },
        logs: [townTexts.retire.ask],
      };
    }

    case 'retire/cancel': {
      const life = requireLife(state);
      if (!life || !life.retireConfirm) return noop(state);
      return {
        state: { ...state, life: { ...life, retireConfirm: undefined } },
        logs: [townTexts.retire.cancel],
      };
    }

    case 'retire/confirm': {
      const life = requireLife(state);
      if (!life || !life.retireConfirm) return noop(state);
      // 引退は死ではないが人生の終わり。魂精算は applyAction の共通フックが行う
      const ended: LifeState = {
        ...life,
        retireConfirm: undefined,
        alive: false,
        deathCause: 'retired',
        scene: 'death',
      };
      return {
        state: { ...state, life: ended },
        logs: [townTexts.retire.done(Math.floor(life.character.ageYears))],
      };
    }

    case 'death/reincarnate': {
      const life = state.life;
      if (state.phase !== 'life' || !life || life.alive) return noop(state);
      // 死亡数・魂は人生終了時の精算フックで反映済み
      return startCreation(state, rng);
    }

    case 'dungeon/advance':
    case 'dungeon/chest':
    case 'dungeon/fountain':
    case 'dungeon/trash':
    case 'dungeon/merchantBuy':
    case 'dungeon/merchantSteal':
    case 'dungeon/merchantLeave':
    case 'dungeon/useItem':
    case 'dungeon/challenge':
    case 'dungeon/retreat':
    case 'retreat/step':
    case 'camp/sleep':
    case 'camp/rest':
      return applyDungeonAction(state, action, rng);

    case 'shop/steal':
    case 'jail/serve':
    case 'jail/escape':
    case 'alley/job':
    case 'tavern/cards':
    case 'tavern/roulette':
    case 'guild/accept':
    case 'guild/report':
      return applyTownRiskAction(state, action, rng);

    case 'combat/attack':
    case 'combat/skill':
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
