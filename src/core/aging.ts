import { balance } from '../data/balance';
import { lifeTexts } from '../data/texts/life';
import type { LifeState } from './types';

/** 日数・年齢の進行と、加齢による衰え・老衰死の純粋ロジック */

interface AdvanceResult {
  life: LifeState;
  logs: string[];
}

/** 加齢による衰えを1歳ぶん適用する */
function applyDecline(life: LifeState): LifeState {
  const { statLossPerYear, maxHpLossPerYear, statFloor } = balance.aging;
  const s = life.character.stats;
  const maxHp = Math.max(statFloor, s.maxHp - maxHpLossPerYear);
  return {
    ...life,
    character: {
      ...life.character,
      stats: {
        maxHp,
        hp: Math.min(s.hp, maxHp),
        strength: Math.max(statFloor, s.strength - statLossPerYear),
        agility: Math.max(statFloor, s.agility - statLossPerYear),
        magic: Math.max(statFloor, s.magic - statLossPerYear),
        luck: s.luck,
      },
    },
  };
}

/**
 * 日数を進める。加齢(daysPerYear ごとに+1歳)・衰え・老衰死もここで処理する。
 * 死亡した場合は scene が 'death' になり、それ以上日数は進まない。
 */
export function advanceDays(life: LifeState, days: number): AdvanceResult {
  let current = life;
  const logs: string[] = [];

  for (let i = 0; i < days; i++) {
    if (!current.alive) break;

    let daysIntoYear = current.daysIntoYear + 1;
    let character = current.character;
    current = { ...current, daysElapsed: current.daysElapsed + 1 };

    if (daysIntoYear >= balance.time.daysPerYear) {
      daysIntoYear = 0;
      character = { ...character, ageYears: character.ageYears + 1 };
      current = { ...current, character };
      logs.push(lifeTexts.aged(character.ageYears));

      if (character.ageYears > balance.aging.declineStartAge) {
        current = applyDecline(current);
        logs.push(lifeTexts.decline);
      }

      if (character.ageYears >= current.lifespanYears) {
        current = {
          ...current,
          alive: false,
          deathCause: 'oldAge',
          scene: 'death',
        };
        logs.push(lifeTexts.deathOldAge(character.ageYears, current.daysElapsed));
        logs.push(lifeTexts.deathSummary(character.gold));
        break;
      }
    }

    current = { ...current, daysIntoYear };
  }

  return { life: current, logs };
}
