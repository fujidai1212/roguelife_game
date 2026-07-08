import type { EnemyId, ItemId } from '../core/types';

/**
 * 冒険者ギルドのクエストのマスターデータ（GAME_DESIGN.md セクション4）。
 * 追加はここに追記するだけで済む（CLAUDE.md アーキテクチャ原則3）。
 * 報酬は労働（年約50G）や盗みと比べて釣り合う範囲で決めること。
 */

export type QuestDef =
  | {
      id: string;
      kind: 'hunt';
      name: string;
      /** 討伐対象と数（受注後の撃破のみ数える） */
      targetEnemy: EnemyId;
      count: number;
      reward: number;
      offer: string;
    }
  | {
      id: string;
      kind: 'gather';
      name: string;
      /** 納品するアイテムと数（報告時に消費する） */
      itemId: ItemId;
      count: number;
      reward: number;
      offer: string;
    };

export const quests: QuestDef[] = [
  {
    id: 'huntSlime',
    kind: 'hunt',
    name: 'スライム退治',
    targetEnemy: 'slime',
    count: 5,
    reward: 80,
    offer: '「スライムを5体。掃除みたいな仕事だが、金は出る」',
  },
  {
    id: 'huntGoblin',
    kind: 'hunt',
    name: 'ゴブリン討伐',
    targetEnemy: 'goblin',
    count: 3,
    reward: 120,
    offer: '「ゴブリンを3体。商隊が襲われた。生きて戻れたら払う」',
  },
  {
    id: 'gatherHerb',
    kind: 'gather',
    name: '薬草の納品',
    itemId: 'herb',
    count: 3,
    reward: 60,
    offer: '「薬草を3つ。教会が買い叩くから、ギルドを通せば少しはましだ」',
  },
];
