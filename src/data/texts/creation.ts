import type { JobId, Stats } from '../../core/types';

/** キャラ作成フローのテキスト */
export const creationTexts = {
  intro: '暗闇の中で声がする。「生まれる前の魂よ。これがお前の器だ。気に入らなければ、別のを選べ。ただし、選び直せるのは3度までだ」',
  statsLine: (s: Stats) =>
    `HP ${s.maxHp}　力 ${s.strength}　素早さ ${s.agility}　魔力 ${s.magic}　運 ${s.luck}`,
  rerolled: '声がため息をつく。「贅沢な魂だ」',
  jobPrompt: (souls: number) =>
    `「職を選べ」。お前の魂は${souls}を数える。魂を差し出せば、別の生き方を買える。`,
  /** 職業選択画面で各職の説明として出す行 */
  jobLine: (name: string, description: string) => `【${name}】${description}`,
  jobUnlocked: (jobName: string, cost: number) =>
    `魂を${cost}差し出した。「${jobName}」の生き方が、これからの全ての来世に開かれた。`,
  jobChosen: {
    jobless: '「無職か。まあ、大半はそうやって死んでいく」声はそれきり聞こえなくなった。',
    swordsman: '「剣士か。腕っぷしだけが頼りの人生だ」声はそれきり聞こえなくなった。',
    thief: '「盗賊か。長生きする奴は、大抵それを選ぶ」声はそれきり聞こえなくなった。',
    mage: '「魔法使いか。その才は身を助け、身を焼くだろう」声はそれきり聞こえなくなった。',
    paladin: '「聖騎士か。ずいぶん上等な死に方を選んだものだ」声はそれきり聞こえなくなった。',
  } satisfies Record<JobId, string>,
  lifeStart: (age: number, gold: number) =>
    `お前は${age}歳の体で目を覚ました。見知らぬ町の路地裏だ。ポケットには${gold}G。それがすべてだ。`,
  choices: {
    reroll: (remaining: number) => `振り直す（残り${remaining}回）`,
    acceptStats: 'この器で生きる',
    lockedJob: (jobName: string, cost: number) => `${jobName}（魂${cost}で解放）`,
  },
} as const;
