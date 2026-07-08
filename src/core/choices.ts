import { balance } from '../data/balance';
import { items, shopStock } from '../data/items';
import { jobOrder, jobs } from '../data/jobs';
import { creationTexts } from '../data/texts/creation';
import { dungeonTexts } from '../data/texts/dungeon';
import { lifeTexts } from '../data/texts/life';
import { townTexts } from '../data/texts/town';
import { shopPrice } from './legacies';
import type { ChoiceBinding, GameAction, GameState, LifeState, TownDest } from './types';

/** 町のハブに並べる行き先。この順で左カラム4つ→右カラム4つに割り当てる */
const townDests: TownDest[] = [
  'guild',
  'tavern',
  'weaponShop',
  'itemShop',
  'alley',
  'work',
  'church',
  'dungeon',
];

function bind(id: string, label: string, action: GameAction): ChoiceBinding {
  return { choice: { id, label }, action };
}

/**
 * 現在の状態から、画面に出す選択肢とそのアクションの組を返す純粋関数。
 * UIはこの結果を表示し、押されたらアクションを applyAction に渡すだけにする。
 */
export function getChoices(state: GameState): ChoiceBinding[] {
  if (state.phase === 'creation') {
    switch (state.creation?.step) {
      case 'stats': {
        const remaining = balance.creation.rerollMax - state.creation.rerollCount;
        return [
          {
            choice: {
              id: 'reroll',
              label: creationTexts.choices.reroll(remaining),
              disabled: remaining <= 0,
            },
            action: { type: 'creation/reroll' },
          },
          bind('acceptStats', creationTexts.choices.acceptStats, { type: 'creation/confirmStats' }),
        ];
      }
      case 'job':
        // 解放済みはそのまま選択、未解放は魂を消費して解放（足りなければ押せない）
        return jobOrder.map((jobId) => {
          const job = jobs[jobId];
          const unlocked = state.meta.unlockedJobs.includes(jobId);
          return {
            choice: {
              id: `job-${jobId}`,
              label: unlocked
                ? job.name
                : creationTexts.choices.lockedJob(job.name, job.unlockCost),
              disabled: !unlocked && state.meta.souls < job.unlockCost,
            },
            action: { type: 'creation/chooseJob', jobId },
          };
        });
      default:
        return [];
    }
  }

  const life = state.life;
  if (!life) return [];

  switch (life.scene) {
    case 'town':
      return townDests.map((dest) =>
        bind(`town-${dest}`, townTexts.destLabels[dest], { type: 'town/go', dest }),
      );
    case 'tavern':
      return [
        bind('rumor', townTexts.tavern.choices.rumor(balance.tavern.rumorPrice), {
          type: 'tavern/rumor',
        }),
        bind('leave', townTexts.tavern.choices.leave, { type: 'scene/backToTown' }),
      ];
    case 'itemShop':
      return [
        ...shopStock.map((itemId) =>
          bind(
            `buy-${itemId}`,
            townTexts.shop.choices.buy(items[itemId].name, shopPrice(state.meta, items[itemId].price)),
            { type: 'shop/buy', itemId },
          ),
        ),
        bind('leave', townTexts.shop.choices.leave, { type: 'scene/backToTown' }),
      ];
    case 'work':
      return [
        ...balance.work.durationChoicesYears.map((years) =>
          bind(`labor-${years}`, townTexts.work.choices.labor(years), {
            type: 'work/labor',
            years,
          }),
        ),
        bind('leave', townTexts.work.choices.backToTown, { type: 'scene/backToTown' }),
      ];
    case 'church':
    case 'guild': {
      if (life.retireConfirm) {
        return [
          bind('retire-confirm', townTexts.retire.choices.confirm, { type: 'retire/confirm' }),
          bind('retire-cancel', townTexts.retire.choices.cancel, { type: 'retire/cancel' }),
        ];
      }
      const texts = life.scene === 'church' ? townTexts.church : townTexts.guild;
      return [
        bind('retire-ask', texts.choices.retire, { type: 'retire/ask' }),
        bind('leave', texts.choices.leave, { type: 'scene/backToTown' }),
      ];
    }
    case 'dungeon':
      return dungeonChoices(life);
    case 'camp':
      return [
        bind('sleep', dungeonTexts.camp.choices.sleep, { type: 'camp/sleep' }),
        bind('rest', dungeonTexts.camp.choices.rest, { type: 'camp/rest' }),
      ];
    case 'combat':
      return combatChoices(life);
    case 'retreat': {
      const floorsLeft = life.dungeon?.retreatFloorsLeft ?? 0;
      if (floorsLeft <= 0) return [];
      return [
        bind('step', dungeonTexts.retreat.choices.step(floorsLeft), { type: 'retreat/step' }),
      ];
    }
    case 'death':
      return [bind('reincarnate', lifeTexts.choices.reincarnate, { type: 'death/reincarnate' })];
  }
}

/** ダンジョン探索中の選択肢: 未解決イベントがあればその2択、なければ進行方向（最大3つ） */
function dungeonChoices(life: LifeState): ChoiceBinding[] {
  const dungeon = life.dungeon;
  if (!dungeon) return [];
  if (dungeon.pendingEvent === 'chest') {
    return [
      bind('chest-open', dungeonTexts.chest.choices.open, { type: 'dungeon/chest', open: true }),
      bind('chest-leave', dungeonTexts.chest.choices.leave, { type: 'dungeon/chest', open: false }),
    ];
  }
  if (dungeon.pendingEvent === 'fountain') {
    return [
      bind('fountain-drink', dungeonTexts.fountain.choices.drink, {
        type: 'dungeon/fountain',
        drink: true,
      }),
      bind('fountain-leave', dungeonTexts.fountain.choices.leave, {
        type: 'dungeon/fountain',
        drink: false,
      }),
    ];
  }
  const current = dungeon.nodes.find((n) => n.id === dungeon.currentNodeId);
  if (!current) return [];
  return current.edges.map((nodeId) => {
    const target = dungeon.nodes.find((n) => n.id === nodeId);
    return bind(`advance-${nodeId}`, target?.hint ?? '', { type: 'dungeon/advance', nodeId });
  });
}

/** 戦闘中の選択肢: メインコマンド（職業にスキルがあれば追加）or アイテムメニュー */
function combatChoices(life: LifeState): ChoiceBinding[] {
  const combat = life.combat;
  if (!combat) return [];
  if (combat.menu === 'main') {
    const main = [bind('attack', dungeonTexts.combat.choices.attack, { type: 'combat/attack' })];
    const skill = jobs[life.character.jobId].activeSkill;
    if (skill) {
      main.push(bind('skill', skill.name, { type: 'combat/skill' }));
    }
    main.push(
      bind('items', dungeonTexts.combat.choices.items, { type: 'combat/itemsOpen' }),
      bind('flee', dungeonTexts.combat.choices.flee, { type: 'combat/flee' }),
    );
    return main;
  }
  return [
    ...ownedItems(life).map(({ itemId, count }) =>
      bind(`combat-use-${itemId}`, dungeonTexts.persistent.useItem(items[itemId].name, count), {
        type: 'combat/useItem',
        itemId,
      }),
    ),
    bind('items-close', dungeonTexts.combat.choices.back, { type: 'combat/itemsClose' }),
  ];
}

/**
 * 常設の行動ボタン（進行選択肢とは別のUI領域に出す。GAME_DESIGN.md セクション5・9）。
 * ダンジョン探索・野営・帰還中のみ: アイテム使用と「歩いて引き返す」。
 */
export function getPersistentActions(state: GameState): ChoiceBinding[] {
  const life = state.life;
  if (state.phase !== 'life' || !life || !life.alive || !life.dungeon) return [];
  if (life.scene !== 'dungeon' && life.scene !== 'camp' && life.scene !== 'retreat') return [];

  const actions = ownedItems(life).map(({ itemId, count }) =>
    bind(`use-${itemId}`, dungeonTexts.persistent.useItem(items[itemId].name, count), {
      type: 'dungeon/useItem',
      itemId,
    }),
  );
  if (life.scene === 'dungeon' || life.scene === 'camp') {
    actions.push(bind('retreat', dungeonTexts.persistent.retreat, { type: 'dungeon/retreat' }));
  }
  return actions;
}

/** 所持しているアイテムを品揃え順に列挙する */
function ownedItems(life: LifeState): { itemId: (typeof shopStock)[number]; count: number }[] {
  return shopStock
    .map((itemId) => ({ itemId, count: life.character.items[itemId] ?? 0 }))
    .filter(({ count }) => count > 0);
}
