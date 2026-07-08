import { balance } from '../data/balance';
import { enemies } from '../data/enemies';
import { items } from '../data/items';
import { dungeonTexts } from '../data/texts/dungeon';
import { townTexts } from '../data/texts/town';
import { applyDamageToPlayer } from './combat';
import {
  createEnemyInstance,
  generateFloor,
  rollChestGold,
  rollPoisonDamage,
  rollTrapDamage,
} from './dungeon';
import { commit, noop, payAge, requireLife } from './helpers';
import type { Rng } from './rng';
import type { ActionResult, DungeonState, GameAction, GameState, LifeState } from './types';

/** ダンジョン探索（戦闘以外）のアクション */
export type DungeonAction = Extract<
  GameAction,
  {
    type:
      | 'dungeon/advance'
      | 'dungeon/chest'
      | 'dungeon/fountain'
      | 'dungeon/useItem'
      | 'dungeon/retreat'
      | 'retreat/step'
      | 'camp/sleep'
      | 'camp/rest';
  }
>;

/** 町からダンジョンへ入る（town/go から呼ばれる） */
export function enterDungeon(state: GameState, life: LifeState, rng: Rng): ActionResult {
  const nodes = generateFloor(rng);
  const dungeon: DungeonState = { depth: 1, nodes, currentNodeId: nodes[0].id };
  const entered: LifeState = {
    ...life,
    scene: 'dungeon',
    dungeon,
    maxDepth: Math.max(life.maxDepth, 1),
  };
  return commit(state, rng.getState(), entered, [dungeonTexts.enter(1)]);
}

export function applyDungeonAction(
  state: GameState,
  action: DungeonAction,
  rng: Rng,
): ActionResult {
  switch (action.type) {
    case 'dungeon/advance': {
      const life = requireLife(state, 'dungeon');
      const dungeon = life?.dungeon;
      if (!life || !dungeon || dungeon.pendingEvent) return noop(state);
      const current = dungeon.nodes.find((n) => n.id === dungeon.currentNodeId);
      const target = dungeon.nodes.find((n) => n.id === action.nodeId);
      if (!current || !target || !current.edges.includes(action.nodeId)) return noop(state);

      const aged = payAge(life, balance.ageCosts.dungeonMove);
      if (aged.died) return commit(state, rng.getState(), aged.life, aged.logs);
      const moved: LifeState = {
        ...aged.life,
        dungeon: { ...dungeon, currentNodeId: target.id },
      };

      switch (target.kind) {
        case 'enemy': {
          const enemy = createEnemyInstance(rng, dungeon.depth);
          const inCombat: LifeState = {
            ...moved,
            scene: 'combat',
            combat: { enemy, menu: 'main', context: 'node' },
          };
          return commit(state, rng.getState(), inCombat, [
            ...aged.logs,
            dungeonTexts.arrive.enemy(enemies[enemy.defId].name),
          ]);
        }
        case 'chest':
          return commit(
            state,
            rng.getState(),
            { ...moved, dungeon: { ...moved.dungeon!, pendingEvent: 'chest' } },
            [...aged.logs, dungeonTexts.arrive.chest],
          );
        case 'fountain':
          return commit(
            state,
            rng.getState(),
            { ...moved, dungeon: { ...moved.dungeon!, pendingEvent: 'fountain' } },
            [...aged.logs, dungeonTexts.arrive.fountain],
          );
        case 'camp':
          return commit(state, rng.getState(), { ...moved, scene: 'camp' }, [
            ...aged.logs,
            dungeonTexts.arrive.camp,
          ]);
        default:
          return commit(state, rng.getState(), moved, [
            ...aged.logs,
            rng.pick(dungeonTexts.arrive.empty),
          ]);
      }
    }

    case 'dungeon/chest': {
      const life = requireLife(state, 'dungeon');
      const dungeon = life?.dungeon;
      if (!life || !dungeon || dungeon.pendingEvent !== 'chest') return noop(state);
      const cleared: LifeState = { ...life, dungeon: { ...dungeon, pendingEvent: undefined } };
      if (!action.open) {
        return commit(state, rng.getState(), cleared, [dungeonTexts.chest.left]);
      }
      if (rng.chance(balance.dungeon.chest.trapChance)) {
        const damage = rollTrapDamage(dungeon.depth);
        const hit = applyDamageToPlayer(cleared, damage, 'trap');
        return commit(state, rng.getState(), hit.life, [
          dungeonTexts.chest.trap(damage),
          ...hit.logs,
        ]);
      }
      const gold = rollChestGold(rng, dungeon.depth);
      const looted: LifeState = {
        ...cleared,
        character: { ...cleared.character, gold: cleared.character.gold + gold },
      };
      return commit(state, rng.getState(), looted, [dungeonTexts.chest.opened(gold)]);
    }

    case 'dungeon/fountain': {
      const life = requireLife(state, 'dungeon');
      const dungeon = life?.dungeon;
      if (!life || !dungeon || dungeon.pendingEvent !== 'fountain') return noop(state);
      const cleared: LifeState = { ...life, dungeon: { ...dungeon, pendingEvent: undefined } };
      if (!action.drink) {
        return commit(state, rng.getState(), cleared, [dungeonTexts.fountain.left]);
      }
      if (rng.chance(balance.dungeon.fountain.poisonChance)) {
        const damage = rollPoisonDamage(dungeon.depth);
        const hit = applyDamageToPlayer(cleared, damage, 'poison');
        return commit(state, rng.getState(), hit.life, [
          dungeonTexts.fountain.poisoned(damage),
          ...hit.logs,
        ]);
      }
      const healed = heal(cleared, Math.round(cleared.character.stats.maxHp * balance.dungeon.fountain.healFraction));
      return commit(state, rng.getState(), healed.life, [
        dungeonTexts.fountain.healed(healed.amount),
      ]);
    }

    case 'camp/sleep': {
      const life = requireLife(state, 'camp');
      const dungeon = life?.dungeon;
      if (!life || !dungeon) return noop(state);
      const aged = payAge(life, balance.ageCosts.campSleep);
      if (aged.died) return commit(state, rng.getState(), aged.life, aged.logs);
      const depth = dungeon.depth + 1;
      const nodes = generateFloor(rng);
      const descended: LifeState = {
        ...aged.life,
        scene: 'dungeon',
        dungeon: { depth, nodes, currentNodeId: nodes[0].id },
        maxDepth: Math.max(aged.life.maxDepth, depth),
      };
      return commit(state, rng.getState(), descended, [
        ...aged.logs,
        dungeonTexts.camp.slept(depth),
      ]);
    }

    case 'camp/rest': {
      const life = requireLife(state, 'camp');
      if (!life || !life.dungeon) return noop(state);
      const aged = payAge(life, balance.ageCosts.campRest);
      if (aged.died) return commit(state, rng.getState(), aged.life, aged.logs);
      const healed = heal(
        aged.life,
        Math.round(aged.life.character.stats.maxHp * balance.dungeon.campRestHealFraction),
      );
      return commit(state, rng.getState(), healed.life, [
        ...aged.logs,
        dungeonTexts.camp.rested(healed.amount),
      ]);
    }

    case 'dungeon/useItem': {
      const life = requireLife(state);
      if (!life || !life.dungeon || life.scene === 'combat' || life.scene === 'death') {
        return noop(state);
      }
      const count = life.character.items[action.itemId] ?? 0;
      if (count <= 0) return noop(state);
      const def = items[action.itemId];
      const consumed: LifeState = {
        ...life,
        character: {
          ...life.character,
          items: { ...life.character.items, [action.itemId]: count - 1 },
        },
      };
      if (def.effect.kind === 'return') {
        const returned: LifeState = { ...consumed, scene: 'town', dungeon: undefined };
        return commit(state, rng.getState(), returned, [
          dungeonTexts.useItem.returned,
          townTexts.hub,
        ]);
      }
      const healed = heal(consumed, def.effect.amount);
      return commit(state, rng.getState(), healed.life, [
        dungeonTexts.useItem.healed(def.name, healed.amount),
      ]);
    }

    case 'dungeon/retreat': {
      const life = requireLife(state);
      const dungeon = life?.dungeon;
      if (!life || !dungeon || (life.scene !== 'dungeon' && life.scene !== 'camp')) {
        return noop(state);
      }
      const retreating: LifeState = {
        ...life,
        scene: 'retreat',
        dungeon: { ...dungeon, pendingEvent: undefined, retreatFloorsLeft: dungeon.depth },
      };
      return commit(state, rng.getState(), retreating, [dungeonTexts.retreat.start(dungeon.depth)]);
    }

    case 'retreat/step': {
      const life = requireLife(state, 'retreat');
      const dungeon = life?.dungeon;
      const floorsLeft = dungeon?.retreatFloorsLeft ?? 0;
      if (!life || !dungeon || floorsLeft <= 0) return noop(state);
      const aged = payAge(life, balance.ageCosts.retreatPerFloor);
      if (aged.died) return commit(state, rng.getState(), aged.life, aged.logs);

      const left = floorsLeft - 1;
      if (left <= 0) {
        const arrived: LifeState = { ...aged.life, scene: 'town', dungeon: undefined };
        return commit(state, rng.getState(), arrived, [
          ...aged.logs,
          dungeonTexts.retreat.arrived,
          townTexts.hub,
        ]);
      }
      const stepped: LifeState = {
        ...aged.life,
        dungeon: { ...dungeon, retreatFloorsLeft: left },
      };
      if (rng.chance(balance.dungeon.retreatEncounterChance)) {
        const enemy = createEnemyInstance(rng, left);
        const ambushed: LifeState = {
          ...stepped,
          scene: 'combat',
          combat: { enemy, menu: 'main', context: 'retreat' },
        };
        return commit(state, rng.getState(), ambushed, [
          ...aged.logs,
          dungeonTexts.retreat.step(left),
          dungeonTexts.retreat.ambush(enemies[enemy.defId].name),
        ]);
      }
      return commit(state, rng.getState(), stepped, [
        ...aged.logs,
        dungeonTexts.retreat.step(left),
      ]);
    }
  }
}

/** HPを回復する（最大HPを超えない）。実際に回復した量も返す */
function heal(life: LifeState, amount: number): { life: LifeState; amount: number } {
  const s = life.character.stats;
  const actual = Math.min(s.maxHp - s.hp, Math.max(0, amount));
  return {
    life: { ...life, character: { ...life.character, stats: { ...s, hp: s.hp + actual } } },
    amount: actual,
  };
}
