import { balance } from '../data/balance';
import { items } from '../data/items';
import { quests } from '../data/quests';
import { underworldJobs } from '../data/underworld';
import { lifeTexts } from '../data/texts/life';
import { townTexts } from '../data/texts/town';
import { createEnemyInstanceById } from './dungeon';
import { commit, noop, payAge, requireLife, stealSuccessChance } from './helpers';
import type { Rng } from './rng';
import type { ActionResult, GameAction, GameState, LifeState } from './types';

/**
 * 町のリスク行動（盗み・牢屋・裏稼業・ギャンブル・クエスト）のハンドラ。
 * 「安全なほど年齢コストが高く、危険なほど低い」（GAME_DESIGN.md セクション3.2）。
 */
export type TownRiskAction = Extract<
  GameAction,
  {
    type:
      | 'shop/steal'
      | 'jail/serve'
      | 'jail/escape'
      | 'alley/job'
      | 'tavern/cards'
      | 'tavern/roulette'
      | 'guild/accept'
      | 'guild/report';
  }
>;

/** 人生を（HPと関係なく）終わらせる。魂精算は applyAction の共通フックが行う */
function endLife(life: LifeState, cause: LifeState['deathCause']): LifeState {
  return { ...life, alive: false, deathCause: cause, scene: 'death', dungeon: undefined, combat: undefined };
}

/** ギルドに入る。クエストが無ければ1件提示し、あれば進捗を添える */
export function enterGuild(state: GameState, life: LifeState, rng: Rng): ActionResult {
  const logs: string[] = [townTexts.guild.enter];
  let quest = life.quest;
  if (!quest) {
    const def = rng.pick(quests);
    quest = { questId: def.id, progress: 0, accepted: false };
    logs.push(townTexts.guild.questOffered(def.offer));
  } else {
    const def = quests.find((q) => q.id === quest!.questId);
    if (def) {
      if (!quest.accepted) {
        logs.push(townTexts.guild.questOffered(def.offer));
      } else if (def.kind === 'hunt') {
        logs.push(townTexts.guild.questProgress(def.name, quest.progress, def.count));
      } else {
        const owned = life.character.items[def.itemId] ?? 0;
        logs.push(townTexts.guild.questGatherProgress(def.name, owned, def.count));
      }
    }
  }
  return commit(state, rng.getState(), { ...life, scene: 'guild', quest }, logs);
}

export function applyTownRiskAction(
  state: GameState,
  action: TownRiskAction,
  rng: Rng,
): ActionResult {
  switch (action.type) {
    case 'shop/steal': {
      const life = requireLife(state, 'itemShop');
      if (!life) return noop(state);
      const item = items[action.itemId];
      const aged = payAge(life, balance.ageCosts.theft);
      if (aged.died) return commit(state, rng.getState(), aged.life, aged.logs);

      if (rng.chance(stealSuccessChance(aged.life, item.price))) {
        const owned = aged.life.character.items[item.id] ?? 0;
        const looted: LifeState = {
          ...aged.life,
          character: {
            ...aged.life.character,
            items: { ...aged.life.character.items, [item.id]: owned + 1 },
          },
        };
        return commit(state, rng.getState(), looted, [
          ...aged.logs,
          townTexts.shop.stealSuccess(item.name),
        ]);
      }
      // 捕まった: 用心棒と戦闘か、牢屋行きか
      if (rng.chance(balance.theft.caughtFightChance)) {
        const caught: LifeState = {
          ...aged.life,
          scene: 'combat',
          combat: { enemy: createEnemyInstanceById('guard', 1), menu: 'main', context: 'town' },
        };
        return commit(state, rng.getState(), caught, [
          ...aged.logs,
          townTexts.shop.stealCaughtFight,
        ]);
      }
      return commit(state, rng.getState(), { ...aged.life, scene: 'jail' }, [
        ...aged.logs,
        townTexts.shop.stealCaughtJail,
        townTexts.jail.enter,
      ]);
    }

    case 'jail/serve': {
      const life = requireLife(state, 'jail');
      if (!life) return noop(state);
      const years = balance.jail.sentenceYears;
      const aged = payAge(life, years);
      if (aged.died) return commit(state, rng.getState(), aged.life, aged.logs);
      return commit(state, rng.getState(), { ...aged.life, scene: 'town' }, [
        ...aged.logs,
        townTexts.jail.served(years),
        townTexts.hub,
      ]);
    }

    case 'jail/escape': {
      const life = requireLife(state, 'jail');
      if (!life) return noop(state);
      const aged = payAge(life, balance.ageCosts.jailEscape);
      if (aged.died) return commit(state, rng.getState(), aged.life, aged.logs);
      const j = balance.jail;
      const { agility, luck } = aged.life.character.stats;
      const chance = Math.min(
        j.escapeMax,
        Math.max(j.escapeMin, j.escapeBase + (agility + luck) * j.escapePerPoint),
      );
      if (rng.chance(chance)) {
        return commit(state, rng.getState(), { ...aged.life, scene: 'town' }, [
          ...aged.logs,
          townTexts.jail.escapeSuccess,
          townTexts.hub,
        ]);
      }
      const dead = endLife(aged.life, 'jail');
      return commit(state, rng.getState(), dead, [
        ...aged.logs,
        townTexts.jail.escapeDeath(Math.floor(dead.character.ageYears)),
        lifeTexts.deathSummary(dead.character.gold),
      ]);
    }

    case 'alley/job': {
      const life = requireLife(state, 'alley');
      if (!life) return noop(state);
      const def = underworldJobs.find((job) => job.id === action.jobId);
      if (!def) return noop(state);
      const aged = payAge(life, def.ageCost);
      if (aged.died) return commit(state, rng.getState(), aged.life, aged.logs);

      const roll = rng.next();
      if (roll < def.successChance) {
        const pay = rng.int(def.payMin, def.payMax);
        const paid: LifeState = {
          ...aged.life,
          character: { ...aged.life.character, gold: aged.life.character.gold + pay },
        };
        return commit(state, rng.getState(), paid, [
          ...aged.logs,
          def.texts.success,
          townTexts.alley.paid(pay),
        ]);
      }
      if (roll < def.successChance + def.jailChance) {
        return commit(state, rng.getState(), { ...aged.life, scene: 'jail' }, [
          ...aged.logs,
          def.texts.jailed,
          townTexts.jail.enter,
        ]);
      }
      const dead = endLife(aged.life, 'underworld');
      return commit(state, rng.getState(), dead, [
        ...aged.logs,
        def.texts.death,
        lifeTexts.deathSummary(dead.character.gold),
      ]);
    }

    case 'tavern/cards': {
      const life = requireLife(state, 'tavern');
      if (!life) return noop(state);
      const g = balance.gamble;
      if (!(g.cardBets as readonly number[]).includes(action.bet)) return noop(state);
      if (life.character.gold < action.bet) {
        return { state, logs: [townTexts.tavern.cards.noMoney] };
      }
      const aged = payAge(life, balance.ageCosts.cards);
      if (aged.died) return commit(state, rng.getState(), aged.life, aged.logs);

      const won = rng.chance(g.cardWinChance);
      const delta = won ? action.bet * (g.cardPayoutMultiplier - 1) : -action.bet;
      const settled: LifeState = {
        ...aged.life,
        character: { ...aged.life.character, gold: aged.life.character.gold + delta },
      };
      const log = won
        ? townTexts.tavern.cards.win(action.bet * g.cardPayoutMultiplier)
        : townTexts.tavern.cards.lose(action.bet);
      return commit(state, rng.getState(), settled, [...aged.logs, log]);
    }

    case 'tavern/roulette': {
      const life = requireLife(state, 'tavern');
      if (!life) return noop(state);
      const g = balance.gamble;
      if (life.character.gold < g.rouletteBet) {
        return { state, logs: [townTexts.tavern.roulette.noMoney] };
      }
      const aged = payAge(life, balance.ageCosts.roulette);
      if (aged.died) return commit(state, rng.getState(), aged.life, aged.logs);

      const betPaid: LifeState = {
        ...aged.life,
        character: { ...aged.life.character, gold: aged.life.character.gold - g.rouletteBet },
      };
      if (rng.chance(g.rouletteDeathChance)) {
        const dead = endLife(betPaid, 'roulette');
        return commit(state, rng.getState(), dead, [
          ...aged.logs,
          townTexts.tavern.roulette.death(Math.floor(dead.character.ageYears)),
          lifeTexts.deathSummary(dead.character.gold),
        ]);
      }
      const payout = g.rouletteBet * g.roulettePayoutMultiplier;
      const survived: LifeState = {
        ...betPaid,
        character: { ...betPaid.character, gold: betPaid.character.gold + payout },
      };
      return commit(state, rng.getState(), survived, [
        ...aged.logs,
        townTexts.tavern.roulette.survive(payout),
      ]);
    }

    case 'guild/accept': {
      const life = requireLife(state, 'guild');
      const quest = life?.quest;
      if (!life || !quest || quest.accepted) return noop(state);
      const def = quests.find((q) => q.id === quest.questId);
      if (!def) return noop(state);
      return commit(
        state,
        rng.getState(),
        { ...life, quest: { ...quest, accepted: true } },
        [townTexts.guild.questAccepted(def.name)],
      );
    }

    case 'guild/report': {
      const life = requireLife(state, 'guild');
      const quest = life?.quest;
      if (!life || !quest || !quest.accepted) return noop(state);
      const def = quests.find((q) => q.id === quest.questId);
      if (!def) return noop(state);

      if (def.kind === 'hunt') {
        if (quest.progress < def.count) {
          return { state, logs: [townTexts.guild.questNotDone] };
        }
        const rewarded: LifeState = {
          ...life,
          quest: undefined,
          character: { ...life.character, gold: life.character.gold + def.reward },
        };
        return commit(state, rng.getState(), rewarded, [
          townTexts.guild.questComplete(def.name, def.reward),
        ]);
      }

      const owned = life.character.items[def.itemId] ?? 0;
      if (owned < def.count) {
        return { state, logs: [townTexts.guild.questNotDone] };
      }
      const rewarded: LifeState = {
        ...life,
        quest: undefined,
        character: {
          ...life.character,
          gold: life.character.gold + def.reward,
          items: { ...life.character.items, [def.itemId]: owned - def.count },
        },
      };
      return commit(state, rng.getState(), rewarded, [
        townTexts.guild.questComplete(def.name, def.reward),
      ]);
    }
  }
}
