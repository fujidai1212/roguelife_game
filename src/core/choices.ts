import { balance } from '../data/balance';
import { items, shopStock } from '../data/items';
import { creationTexts } from '../data/texts/creation';
import { lifeTexts } from '../data/texts/life';
import { townTexts } from '../data/texts/town';
import type { ChoiceBinding, GameAction, GameState, TownDest } from './types';

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
      case 'stats':
        return [
          bind('reroll', creationTexts.choices.reroll, { type: 'creation/reroll' }),
          bind('acceptStats', creationTexts.choices.acceptStats, { type: 'creation/confirmStats' }),
        ];
      case 'age':
        return [bind('acceptAge', creationTexts.choices.acceptAge, { type: 'creation/confirmAge' })];
      case 'job':
        return [
          bind('jobless', creationTexts.choices.jobless, {
            type: 'creation/chooseJob',
            jobId: 'jobless',
          }),
        ];
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
          bind(`buy-${itemId}`, townTexts.shop.choices.buy(items[itemId].name, items[itemId].price), {
            type: 'shop/buy',
            itemId,
          }),
        ),
        bind('leave', townTexts.shop.choices.leave, { type: 'scene/backToTown' }),
      ];
    case 'work':
      return [
        bind('labor', townTexts.work.choices.labor, { type: 'work/labor' }),
        bind('leave', townTexts.work.choices.backToTown, { type: 'scene/backToTown' }),
      ];
    case 'death':
      return [bind('reincarnate', lifeTexts.choices.reincarnate, { type: 'death/reincarnate' })];
  }
}
