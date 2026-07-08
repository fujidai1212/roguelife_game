/** 魂精算・レガシー解放のテキスト */
export const soulTexts = {
  /** 達成度ティアの名前（インデックス＝ティア番号） */
  tierNames: ['野垂れ死に', '駆け出し', '一人前', '熟練', '英雄'],
  settlement: (tierName: string, souls: number, total: number) =>
    `お前の生涯は「${tierName}」と査定された。魂を${souls}得た。（合計: ${total}）`,
  legacyUnlocked: (name: string, description: string) =>
    `▼レガシー解放「${name}」──${description}`,
} as const;
