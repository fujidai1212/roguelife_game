import type { Stats } from '../../core/types';

/** キャラ作成フローのテキスト */
export const creationTexts = {
  intro: '暗闇の中で声がする。「生まれる前の魂よ。これがお前の器だ。気に入らなければ、別のを選べ」',
  statsLine: (s: Stats) =>
    `HP ${s.maxHp}　力 ${s.strength}　素早さ ${s.agility}　魔力 ${s.magic}　運 ${s.luck}`,
  rerolled: '声がため息をつく。「贅沢な魂だ」',
  ageRolled: (age: number) =>
    `「お前は${age}歳の体で生まれる」若ければ先は長い。年を食っていれば、多少はましな体だが、残りは短い。`,
  jobPrompt: '「職を選べ」といっても、今のお前に選べる生き方は一つしかない。',
  jobChosen: '「無職か。まあ、大半はそうやって死んでいく」声はそれきり聞こえなくなった。',
  lifeStart: (gold: number) =>
    `お前は目を覚ました。見知らぬ町の路地裏だ。ポケットには${gold}G。それがすべてだ。`,
  choices: {
    reroll: '振り直す',
    acceptStats: 'この器で生きる',
    acceptAge: '受け入れる',
    jobless: '無職として生きる',
  },
} as const;
