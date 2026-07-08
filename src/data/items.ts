import type { ItemId } from '../core/types';

/**
 * アイテムのマスターデータ。追加はここに追記するだけで済むようにする
 * （CLAUDE.md アーキテクチャ原則3）。
 * TODO: 価格は仮置き。効果の実装はフェーズ2（戦闘・ダンジョン）以降。
 */

export interface ItemDef {
  id: ItemId;
  name: string;
  price: number;
  description: string;
}

export const items: Record<ItemId, ItemDef> = {
  herb: {
    id: 'herb',
    name: '薬草',
    price: 10,
    description: '噛むと苦い。HPを少し回復する。',
  },
  potion: {
    id: 'potion',
    name: 'ポーション',
    price: 30,
    description: '澱んだ緑色の液体。HPを回復する。',
  },
  returnScroll: {
    id: 'returnScroll',
    name: '帰還の巻物',
    price: 200,
    description: 'ダンジョンから町へ即座に戻れる。命の値段としては安い。',
  },
};

/** 道具屋の品揃え（並び順もここで決める） */
export const shopStock: ItemId[] = ['herb', 'potion', 'returnScroll'];
