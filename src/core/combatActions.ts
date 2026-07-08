import { balance } from '../data/balance';
import { enemies } from '../data/enemies';
import { items } from '../data/items';
import { jobs } from '../data/jobs';
import { quests } from '../data/quests';
import { dungeonTexts } from '../data/texts/dungeon';
import { townTexts } from '../data/texts/town';
import { fleeChance, playerActsFirst, resolveEnemyAttack, resolvePlayerAttack } from './combat';
import { commit, noop, payAge, requireLife } from './helpers';
import type { Rng } from './rng';
import type { ActionResult, CombatState, GameAction, GameState, LifeState } from './types';

/** 戦闘中のアクション */
export type CombatAction = Extract<
  GameAction,
  {
    type:
      | 'combat/attack'
      | 'combat/skill'
      | 'combat/itemsOpen'
      | 'combat/itemsClose'
      | 'combat/useItem'
      | 'combat/flee';
  }
>;

export function applyCombatAction(state: GameState, action: CombatAction, rng: Rng): ActionResult {
  const life = requireLife(state, 'combat');
  const combat = life?.combat;
  if (!life || !combat) return noop(state);

  switch (action.type) {
    case 'combat/itemsOpen':
      if (combat.menu !== 'main') return noop(state);
      return commit(state, rng.getState(), withMenu(life, combat, 'items'), []);

    case 'combat/itemsClose':
      if (combat.menu !== 'items') return noop(state);
      return commit(state, rng.getState(), withMenu(life, combat, 'main'), []);

    case 'combat/attack': {
      if (combat.menu !== 'main') return noop(state);
      const aged = payAge(life, balance.ageCosts.combatTurn);
      if (aged.died) return commit(state, rng.getState(), aged.life, aged.logs);
      return resolveRound(state, rng, aged.life, combat, aged.logs, 'attack');
    }

    case 'combat/skill': {
      if (combat.menu !== 'main') return noop(state);
      const skill = jobs[life.character.jobId].activeSkill;
      if (!skill) return noop(state);
      const aged = payAge(life, balance.ageCosts.combatTurn);
      if (aged.died) return commit(state, rng.getState(), aged.life, aged.logs);

      if (skill.id === 'magicAttack') {
        return resolveRound(state, rng, aged.life, combat, aged.logs, 'magic');
      }
      // 自己回復: 回復にターンを使い、敵の攻撃を受ける
      const healed = healPlayer(
        aged.life,
        Math.round(aged.life.character.stats.maxHp * balance.skills.selfHealFraction),
      );
      const logs = [...aged.logs, dungeonTexts.combat.selfHealed(healed.amount)];
      const hit = resolveEnemyAttack(rng, healed.life, combat.enemy);
      if (hit.died) return commit(state, rng.getState(), hit.life, [...logs, ...hit.logs]);
      return commit(state, rng.getState(), withMenu(hit.life, combat, 'main'), [
        ...logs,
        ...hit.logs,
      ]);
    }

    case 'combat/flee': {
      if (combat.menu !== 'main') return noop(state);
      const aged = payAge(life, balance.ageCosts.combatTurn);
      if (aged.died) return commit(state, rng.getState(), aged.life, aged.logs);
      if (rng.chance(fleeChance(aged.life))) {
        return commit(state, rng.getState(), endCombat(aged.life, combat), [
          ...aged.logs,
          dungeonTexts.combat.fleeSuccess,
        ]);
      }
      // 逃げ損ねると無防備なまま殴られる（GAME_DESIGN.md セクション6）
      const hit = resolveEnemyAttack(rng, aged.life, combat.enemy);
      return commit(state, rng.getState(), hit.life, [
        ...aged.logs,
        dungeonTexts.combat.fleeFail,
        ...hit.logs,
      ]);
    }

    case 'combat/useItem': {
      if (combat.menu !== 'items') return noop(state);
      const count = life.character.items[action.itemId] ?? 0;
      if (count <= 0) return noop(state);
      const def = items[action.itemId];

      if (def.effect.kind === 'return') {
        // 帰還の巻物は戦闘からも即座に離脱できる
        const returned: LifeState = {
          ...consumeItem(life, action.itemId),
          scene: 'town',
          dungeon: undefined,
          combat: undefined,
        };
        return commit(state, rng.getState(), returned, [
          dungeonTexts.useItem.returned,
          townTexts.hub,
        ]);
      }

      const aged = payAge(life, balance.ageCosts.combatTurn);
      if (aged.died) return commit(state, rng.getState(), aged.life, aged.logs);
      const healed = healPlayer(consumeItem(aged.life, action.itemId), def.effect.amount);
      const logs = [...aged.logs, dungeonTexts.useItem.healed(def.name, healed.amount)];
      // アイテム使用でターンを消費し、敵の攻撃を受ける
      const hit = resolveEnemyAttack(rng, healed.life, combat.enemy);
      if (hit.died) return commit(state, rng.getState(), hit.life, [...logs, ...hit.logs]);
      return commit(state, rng.getState(), withMenu(hit.life, combat, 'main'), [
        ...logs,
        ...hit.logs,
      ]);
    }
  }
}

/** 攻撃/魔法攻撃コマンド1回ぶん（素早さ順に両者が行動）を解決する */
function resolveRound(
  state: GameState,
  rng: Rng,
  life: LifeState,
  combat: CombatState,
  logs: string[],
  mode: 'attack' | 'magic',
): ActionResult {
  let enemy = combat.enemy;
  const playerFirst = playerActsFirst(life, enemy);

  if (!playerFirst) {
    const hit = resolveEnemyAttack(rng, life, enemy);
    logs = [...logs, ...hit.logs];
    if (hit.died) return commit(state, rng.getState(), hit.life, logs);
    life = hit.life;
  }

  const attack = resolvePlayerAttack(rng, life, enemy, mode);
  enemy = attack.enemy;
  logs = [...logs, ...attack.logs];
  if (enemy.hp <= 0) {
    const gold = rng.int(enemy.goldMin, enemy.goldMax);
    let rewarded: LifeState = {
      ...life,
      kills: life.kills + 1,
      character: { ...life.character, gold: life.character.gold + gold },
    };
    logs = [...logs, dungeonTexts.combat.win(enemies[enemy.defId].name, gold)];

    // レアモンスターは倒すと来世に持ち越す魂ボーナスを落とす
    if (enemy.defId === 'goldenSlime') {
      const bonus = balance.dungeon.rare.bonusSouls;
      rewarded = { ...rewarded, bonusSouls: rewarded.bonusSouls + bonus };
      logs = [...logs, dungeonTexts.combat.rareBonus(bonus)];
    }

    // 受注中の討伐クエストの対象なら進捗を進める
    const quest = rewarded.quest;
    if (quest?.accepted) {
      const def = quests.find((q) => q.id === quest.questId);
      if (def?.kind === 'hunt' && def.targetEnemy === enemy.defId && quest.progress < def.count) {
        const progress = quest.progress + 1;
        rewarded = { ...rewarded, quest: { ...quest, progress } };
        logs = [...logs, townTexts.guild.questProgress(def.name, progress, def.count)];
      }
    }

    return commit(state, rng.getState(), endCombat(rewarded, combat), logs);
  }

  if (playerFirst) {
    const hit = resolveEnemyAttack(rng, life, enemy);
    logs = [...logs, ...hit.logs];
    if (hit.died) return commit(state, rng.getState(), hit.life, logs);
    life = hit.life;
  }

  return commit(
    state,
    rng.getState(),
    { ...life, combat: { ...combat, enemy, menu: 'main' } },
    logs,
  );
}

/** 戦闘を終了し、元いた場面（ノード探索 / 帰還 / 町）へ戻る */
function endCombat(life: LifeState, combat: CombatState): LifeState {
  const scene =
    combat.context === 'retreat' ? 'retreat' : combat.context === 'town' ? 'town' : 'dungeon';
  return { ...life, combat: undefined, scene };
}

function withMenu(life: LifeState, combat: CombatState, menu: CombatState['menu']): LifeState {
  return { ...life, combat: { ...combat, menu } };
}

function consumeItem(life: LifeState, itemId: keyof typeof items): LifeState {
  const count = life.character.items[itemId] ?? 0;
  return {
    ...life,
    character: { ...life.character, items: { ...life.character.items, [itemId]: count - 1 } },
  };
}

function healPlayer(life: LifeState, amount: number): { life: LifeState; amount: number } {
  const s = life.character.stats;
  const actual = Math.min(s.maxHp - s.hp, Math.max(0, amount));
  return {
    life: { ...life, character: { ...life.character, stats: { ...s, hp: s.hp + actual } } },
    amount: actual,
  };
}
