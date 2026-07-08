/** 画面枠まわり（ステータス帯・場面名・システムメニュー）のテキスト */
export const uiTexts = {
  /** イラスト欄のプレースホルダーに出す場面名 */
  sceneNames: {
    creation: '生まれる前の暗闇',
    town: '町の大通り',
    tavern: '酒場',
    itemShop: '道具屋',
    work: '働き口',
    death: '人生の終わり',
  },
  statusLine: (hp: number, maxHp: number, gold: number, age: number) =>
    `HP ${hp}/${maxHp}　金 ${gold}G　${age.toFixed(1)}歳`,
  statusLineEmpty: 'HP -/-　金 -G　年齢 -',
  resumed: '（前回の続きから再開した。）',
  systemLabels: {
    status: 'ステータス',
    pause: '中断',
    settings: '設定',
  },
  systemNotImplemented: (label: string) => `（${label}はまだ実装されていない。）`,
} as const;
