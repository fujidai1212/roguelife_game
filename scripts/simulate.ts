/**
 * バランス検証用のシミュレーション（フェーズ5）。
 * src/core/ の applyAction を自動プレイヤーで回し、職業ごとの
 * 平均生存年数・平均到達深度・ボス撃破率と、周回でボス撃破に
 * 到達するまでの人生数を出す。UIには依存しない。
 *
 * 実行: npm run simulate
 */

import { balance } from '../src/data/balance';
import { items } from '../src/data/items';
import { jobs } from '../src/data/jobs';
import { applyAction, initialMeta, newGame } from '../src/core/actions';
import { createRng, type Rng } from '../src/core/rng';
import { shopPrice } from '../src/core/legacies';
import type { GameAction, GameState, JobId, LifeState } from '../src/core/types';

/** 自動プレイヤーの方針パラメータ（「素直な新規プレイヤー」を模す） */
const policy = {
  potionsToCarry: 4,
  healBelowFraction: 0.5, // HPがこれを下回ったら回復手段を探す
  fleeBelowFraction: 0.25, // 回復手段がなくこれを下回ったら逃げる
  restBelowFraction: 0.8, // 野営地でこれを下回っていたら眠る前に休息
  goldReserve: 20, // 使い切らずに残す金
};

/** 1人生の結果 */
interface LifeResult {
  jobId: JobId;
  yearsLived: number;
  maxDepth: number;
  souls: number;
  bossKilled: boolean;
  cause: string;
}

function ownedCount(life: LifeState, itemId: keyof typeof items): number {
  return life.character.items[itemId] ?? 0;
}

function hpFraction(life: LifeState): number {
  return life.character.stats.hp / life.character.stats.maxHp;
}

/** 現在の状態から自動プレイヤーの次の一手を決める */
function decide(state: GameState, bot: Rng): GameAction {
  const life = state.life!;
  const potionPrice = shopPrice(state.meta, items.potion.price);

  switch (life.scene) {
    case 'town': {
      const wantPotions =
        ownedCount(life, 'potion') < policy.potionsToCarry &&
        life.character.gold >= potionPrice + policy.goldReserve;
      if (wantPotions) return { type: 'town/go', dest: 'itemShop' };
      // 回復手段が何もなく金もないなら、1年働いて立て直す
      if (ownedCount(life, 'potion') === 0 && ownedCount(life, 'herb') === 0) {
        return { type: 'town/go', dest: 'work' };
      }
      return { type: 'town/go', dest: 'dungeon' };
    }
    case 'itemShop': {
      if (
        ownedCount(life, 'potion') < policy.potionsToCarry &&
        life.character.gold >= potionPrice + policy.goldReserve
      ) {
        return { type: 'shop/buy', itemId: 'potion' };
      }
      return { type: 'scene/backToTown' };
    }
    case 'work':
      if (ownedCount(life, 'potion') === 0 && life.character.gold < potionPrice + policy.goldReserve) {
        return { type: 'work/labor', years: 1 };
      }
      return { type: 'scene/backToTown' };

    case 'dungeon': {
      const dungeon = life.dungeon!;
      // 未解決イベントを先に処理する
      if (dungeon.pendingEvent === 'chest') return { type: 'dungeon/chest', open: true };
      if (dungeon.pendingEvent === 'fountain') {
        // 半分は毒なので、追い詰められたときだけ賭ける
        return { type: 'dungeon/fountain', drink: hpFraction(life) < policy.fleeBelowFraction };
      }
      if (dungeon.pendingEvent === 'trash') return { type: 'dungeon/trash', dig: false };
      if (dungeon.pendingEvent === 'merchant') {
        if (
          ownedCount(life, 'potion') < policy.potionsToCarry &&
          life.character.gold >= Math.round(items.potion.price * balance.dungeon.merchant.priceMarkup)
        ) {
          return { type: 'dungeon/merchantBuy', itemId: 'potion' };
        }
        return { type: 'dungeon/merchantLeave' };
      }
      // HPが減っていたら進む前に回復する
      if (hpFraction(life) < policy.healBelowFraction) {
        if (ownedCount(life, 'potion') > 0) return { type: 'dungeon/useItem', itemId: 'potion' };
        if (ownedCount(life, 'herb') > 0) return { type: 'dungeon/useItem', itemId: 'herb' };
        // 回復手段がない: 巻物があれば帰還、なければ歩いて引き返す
        if (ownedCount(life, 'returnScroll') > 0) {
          return { type: 'dungeon/useItem', itemId: 'returnScroll' };
        }
        if (hpFraction(life) < policy.fleeBelowFraction) return { type: 'dungeon/retreat' };
      }
      const current = dungeon.nodes.find((n) => n.id === dungeon.currentNodeId)!;
      // ボス戦から逃げた直後: 回復してから挑み直す（上の回復判定を通過した状態）
      if (current.kind === 'midBoss' || current.kind === 'boss') return { type: 'dungeon/challenge' };
      return { type: 'dungeon/advance', nodeId: bot.pick(current.edges) };
    }

    case 'camp':
      if (hpFraction(life) < policy.restBelowFraction) return { type: 'camp/rest' };
      return { type: 'camp/sleep' };

    case 'combat': {
      const combat = life.combat!;
      if (combat.menu === 'items') {
        if (ownedCount(life, 'potion') > 0) return { type: 'combat/useItem', itemId: 'potion' };
        if (ownedCount(life, 'herb') > 0) return { type: 'combat/useItem', itemId: 'herb' };
        return { type: 'combat/itemsClose' };
      }
      // 危なくなったら回復（アイテム or 聖騎士の自己回復）、それも無理なら逃走
      if (hpFraction(life) < policy.healBelowFraction) {
        const skill = jobs[life.character.jobId].activeSkill;
        if (skill?.id === 'selfHeal') return { type: 'combat/skill' };
        if (ownedCount(life, 'potion') > 0 || ownedCount(life, 'herb') > 0) {
          return { type: 'combat/itemsOpen' };
        }
        if (hpFraction(life) < policy.fleeBelowFraction && !combat.bossKind) {
          return { type: 'combat/flee' };
        }
      }
      if (jobs[life.character.jobId].activeSkill?.id === 'magicAttack') {
        return { type: 'combat/skill' };
      }
      return { type: 'combat/attack' };
    }

    case 'retreat':
      return { type: 'retreat/step' };

    default:
      // 想定外の場面（牢屋など。この方針では起きない）
      throw new Error(`bot has no policy for scene: ${life.scene}`);
  }
}

/** キャラ作成を済ませて1人生をプレイする。state はメタを引き継いだ creation フェーズであること */
function playLife(state: GameState, jobId: JobId, bot: Rng): { state: GameState; result: LifeResult } {
  state = applyAction(state, { type: 'creation/confirmStats' }).state;
  state = applyAction(state, { type: 'creation/chooseJob', jobId }).state;
  if (state.phase !== 'life') throw new Error(`could not start life as ${jobId}`);

  for (let step = 0; step < 20000 && state.life!.alive; step++) {
    state = applyAction(state, decide(state, bot)).state;
  }
  const life = state.life!;
  if (life.alive) throw new Error('life did not end within step limit');

  const result: LifeResult = {
    jobId,
    yearsLived: life.character.ageYears - balance.creation.startAge,
    maxDepth: life.maxDepth,
    souls: life.settlement!.souls,
    bossKilled: life.bossKills > 0,
    cause: life.deathCause!,
  };
  // 転生してメタを引き継いだ creation フェーズへ
  return { state: applyAction(state, { type: 'death/reincarnate' }).state, result };
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const pct = (n: number, total: number) => `${((100 * n) / total).toFixed(1)}%`;

/** モード1: 職業ごとの素の性能（メタ進行なし・レガシーなし） */
function jobComparison(livesPerJob: number) {
  console.log(`\n== 職業別の素の成績（レガシーなし、各${livesPerJob}人生） ==`);
  console.log('職業\t平均寿命\t平均深度\t最高深度\t魂/人生\tボス撃破率\t主な死因');
  for (const jobId of Object.keys(jobs) as JobId[]) {
    const results: LifeResult[] = [];
    const bot = createRng(9000 + jobId.length);
    let state = newGame(1, { ...initialMeta(), unlockedJobs: [jobId] }).state;
    for (let i = 0; i < livesPerJob; i++) {
      const played = playLife(state, jobId, bot);
      // メタ進行の影響を消すため、毎回まっさらなメタで作成し直す
      state = { ...played.state, meta: { ...initialMeta(), unlockedJobs: [jobId] } };
      results.push(played.result);
    }
    const causes = new Map<string, number>();
    for (const r of results) causes.set(r.cause, (causes.get(r.cause) ?? 0) + 1);
    const topCause = [...causes.entries()].sort((a, b) => b[1] - a[1])[0];
    console.log(
      [
        jobs[jobId].name,
        avg(results.map((r) => r.yearsLived)).toFixed(1) + '年',
        avg(results.map((r) => r.maxDepth)).toFixed(2),
        Math.max(...results.map((r) => r.maxDepth)),
        avg(results.map((r) => r.souls)).toFixed(1),
        pct(results.filter((r) => r.bossKilled).length, results.length),
        `${topCause[0]}(${pct(topCause[1], results.length)})`,
      ].join('\t'),
    );
  }
}

/** 解放可能な最上位の職業を選ぶ（新規プレイヤーの自然な選択を模す） */
function pickJob(state: GameState): JobId {
  const order: JobId[] = ['paladin', 'mage', 'swordsman', 'thief', 'jobless'];
  for (const jobId of order) {
    if (state.meta.unlockedJobs.includes(jobId)) return jobId;
    if (state.meta.souls >= jobs[jobId].unlockCost) return jobId; // 魂を払って解放
  }
  return 'jobless';
}

/** モード2: まっさらな状態から周回して、何人生目でボスを倒せるか */
function progression(runs: number, maxLives: number) {
  console.log(`\n== 周回シミュレーション（${runs}回試行、最大${maxLives}人生） ==`);
  const livesToKill: number[] = [];
  for (let run = 0; run < runs; run++) {
    const bot = createRng(70000 + run);
    let state = newGame(1000 + run).state;
    for (let lifeNo = 1; lifeNo <= maxLives; lifeNo++) {
      const played = playLife(state, pickJob(state), bot);
      state = played.state;
      if (played.result.bossKilled) {
        livesToKill.push(lifeNo);
        break;
      }
    }
  }
  livesToKill.sort((a, b) => a - b);
  const reached = livesToKill.length;
  console.log(`ボス撃破に到達した試行: ${reached}/${runs} (${pct(reached, runs)})`);
  if (reached > 0) {
    const q = (f: number) => livesToKill[Math.min(reached - 1, Math.floor(f * reached))];
    console.log(
      `撃破までの人生数: 最短${livesToKill[0]} / 中央値${q(0.5)} / 75%タイル${q(0.75)} / 最長${livesToKill[reached - 1]}`,
    );
  }
}

const livesPerJob = Number(process.argv[2] ?? 300);
const runs = Number(process.argv[3] ?? 100);
const maxLives = Number(process.argv[4] ?? 30);
jobComparison(livesPerJob);
progression(runs, maxLives);
