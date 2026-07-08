import { balance } from '../data/balance';
import { lifeTexts } from '../data/texts/life';
import type { LifeState } from './types';

/**
 * 年齢コストの支払いと、加齢による衰え・老衰死の純粋ロジック
 * （GAME_DESIGN.md セクション3）。
 */

interface AdvanceResult {
  life: LifeState;
  logs: string[];
}

/** 浮動小数の誤差が表示や判定に漏れないよう、年齢は小数2桁に丸めて保持する */
export function roundAge(age: number): number {
  return Math.round(age * 100) / 100;
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
 * 年齢コストを支払って歳を進める。整数年齢が上がる（誕生日を越える）たびに
 * 衰え・老衰死を判定する。死亡した場合は scene が 'death' になり、
 * 年齢は死亡した歳で止まる。
 */
export function advanceAge(life: LifeState, years: number): AdvanceResult {
  if (!life.alive || years <= 0) return { life, logs: [] };

  const logs: string[] = [];
  const targetAge = roundAge(life.character.ageYears + years);
  let current = life;

  // 越える誕生日を1歳ずつ処理する（例: 44.8歳 + 2.5歳 → 45歳・46歳・47歳を通過）
  const firstBirthday = Math.floor(current.character.ageYears) + 1;
  const lastBirthday = Math.floor(targetAge);
  for (let age = firstBirthday; age <= lastBirthday; age++) {
    current = { ...current, character: { ...current.character, ageYears: age } };
    logs.push(lifeTexts.aged(age));

    if (age > balance.aging.declineStartAge) {
      current = applyDecline(current);
      logs.push(lifeTexts.decline);
    }

    if (age >= current.lifespanYears) {
      current = { ...current, alive: false, deathCause: 'oldAge', scene: 'death' };
      logs.push(lifeTexts.deathOldAge(age));
      logs.push(lifeTexts.deathSummary(current.character.gold));
      return { life: current, logs };
    }
  }

  current = { ...current, character: { ...current.character, ageYears: targetAge } };
  return { life: current, logs };
}
