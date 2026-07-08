import type { Stats } from '../../core/types';

/** キャラ作成フローのテキスト */
export const creationTexts = {
  intro: '暗闇の中で声がする。「生まれる前の魂よ。これがお前の器だ。気に入らなければ、別のを選べ。ただし、選び直せるのは3度までだ」',
  statsLine: (s: Stats) =>
    `HP ${s.maxHp}　力 ${s.strength}　素早さ ${s.agility}　魔力 ${s.magic}　運 ${s.luck}`,
  rerolled: '声がため息をつく。「贅沢な魂だ」',
  jobPrompt: '「職を選べ」といっても、今のお前に選べる生き方は一つしかない。',
  jobChosen: '「無職か。まあ、大半はそうやって死んでいく」声はそれきり聞こえなくなった。',
  lifeStart: (age: number, gold: number) =>
    `お前は${age}歳の体で目を覚ました。見知らぬ町の路地裏だ。ポケットには${gold}G。それがすべてだ。`,
  choices: {
    reroll: (remaining: number) => `振り直す（残り${remaining}回）`,
    acceptStats: 'この器で生きる',
    jobless: '無職として生きる',
  },
} as const;
