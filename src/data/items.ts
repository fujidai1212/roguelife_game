import type { ItemId } from '../core/types';

/**
 * アイテムのマスターデータ。追加はここに追記するだけで済むようにする
 * （CLAUDE.md アーキテクチャ原則3）。
 * フェーズ5のシミュレーションで、この価格・効果量を前提に難易度を調整済み。
 * 特にポーションは深層攻略の生命線なので、変えるときは npm run simulate で検証すること。
 */

/** アイテムの使用効果 */
export type ItemEffect =
  | { kind: 'heal'; amount: number }
  | { kind: 'return' }; // ダンジョンから町へ即時帰還

export interface ItemDef {
  id: ItemId;
  name: string;
  price: number;
  description: string;
  effect: ItemEffect;
}

export const items: Record<ItemId, ItemDef> = {
  herb: {
    id: 'herb',
    name: '薬草',
    price: 10,
    description: '噛むと苦い。HPを少し回復する。',
    effect: { kind: 'heal', amount: 12 },
  },
  potion: {
    id: 'potion',
    name: 'ポーション',
    price: 30,
    description: '澱んだ緑色の液体。HPを回復する。',
    effect: { kind: 'heal', amount: 35 },
  },
  returnScroll: {
    id: 'returnScroll',
    name: '帰還の巻物',
    price: 200,
    description: 'ダンジョンから町へ即座に戻れる。命の値段としては安い。',
    effect: { kind: 'return' },
  },
};

/** 道具屋の品揃え（並び順もここで決める） */
export const shopStock: ItemId[] = ['herb', 'potion', 'returnScroll'];
