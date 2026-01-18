/**
 * LarkBase デモデータ登録スクリプト v2
 *
 * YouTubeショート制作会社向けのリアルなデモデータ
 */

import 'dotenv/config';
import { createLarkBaseClient } from '../src/api/larkbase.js';
import { LARKBASE_CONFIG } from '../src/config/larkbase-mapping.js';

// 架空のYouTubeショート制作関連クライアント（5社）
const CLIENTS = [
  '株式会社バズクリエイト',
  '合同会社ショートムービーズ',
  'TikTok Master株式会社',
  '株式会社インフルエンサーラボ',
  'クリエイターズギルド合同会社',
];

// YouTubeショートっぽい案件名
const PROJECT_NAMES = [
  '【衝撃】知らないと損する節約術5選',
  '【検証】100均グッズで高級料理作ってみた',
  '【あるある】社会人1年目のリアル',
  '【神回】猫が初めて○○を見た結果...',
  '【裏技】iPhoneの隠し機能がヤバすぎた',
  '【感動】泣ける話 - おばあちゃんの手紙',
  '【爆笑】彼女にドッキリしたら予想外の展開に',
  '【比較】コンビニおにぎり食べ比べランキング',
  '【解説】なぜZ世代は○○なのか？',
  '【密着】人気YouTuberの1日ルーティン',
  '【挑戦】24時間コンビニ飯生活してみた',
  '【暴露】元アイドルが業界の闇を語る',
  '【レビュー】話題の美容グッズ本音レビュー',
  '【ASMR】最高に眠れる耳かき音',
  '【ダイエット】1週間で-3kg達成した方法',
  '【旅行】穴場スポット！京都の隠れ家カフェ',
  '【ゲーム実況】神プレイ連発！フォートナイト',
  '【料理】5分で作れる絶品パスタレシピ',
  '【ファッション】GUで作る高見えコーデ',
  '【ペット】柴犬の可愛すぎる瞬間まとめ',
];

// 備考のパターン
const NOTES_PATTERNS = [
  '修正1回込み。追加修正は別途見積もり。',
  'BGM・SE込み。著作権フリー素材使用。',
  'サムネイル制作含む。',
  'テロップ・字幕対応。縦型フォーマット。',
  '急ぎ案件のため特急料金適用。',
  'シリーズ物の第3弾。前回と同じテイストで。',
  'クライアント素材支給。編集のみ。',
  '企画から台本作成まで含む。',
  'インフルエンサーコラボ案件。',
  '月額契約の一部。',
  null, // 備考なし
  null,
  null,
];

// 内容タイプ
const CONTENT_TYPES = ['編集', 'ディレクション', '運用', '台本', '外注'];

// ステータス
const STATUS_TYPES = ['未着手', '着手中', '提出', '修正中', '納品'];

function generateDemoData(): Array<{ fields: Record<string, unknown> }> {
  const records: Array<{ fields: Record<string, unknown> }> = [];

  // 2026年1月〜3月のデータを生成
  for (let i = 0; i < 20; i++) {
    // 日付をランダムに設定（2026年1月〜3月）
    const monthOffset = Math.floor(i / 7); // 0, 1, 2
    const day = (i % 25) + 1;
    const scheduledDate = new Date(2026, monthOffset, day);

    // 初校提出日は予定日の1-5日後
    const submissionOffset = Math.floor(Math.random() * 5) + 1;
    const submissionDate = new Date(scheduledDate);
    submissionDate.setDate(submissionDate.getDate() + submissionOffset);

    // 請求日は提出日の3-7日後
    const invoiceOffset = Math.floor(Math.random() * 5) + 3;
    const invoiceDate = new Date(submissionDate);
    invoiceDate.setDate(invoiceDate.getDate() + invoiceOffset);

    // クライアントをランダムに選択
    const clientIndex = i % CLIENTS.length;
    const client = CLIENTS[clientIndex];

    // 内容をランダムに選択
    const contentIndex = i % CONTENT_TYPES.length;
    const content = CONTENT_TYPES[contentIndex];

    // ステータス（15件は納品済み、5件は進行中）
    const statusIndex = i < 15 ? 4 : i % 4; // 納品 or 他
    const status = STATUS_TYPES[statusIndex];
    const isDelivered = status === '納品';

    // 単価設定
    const unitPrices: Record<string, number> = {
      '編集': 35000,
      'ディレクション': 55000,
      '運用': 25000,
      '台本': 20000,
      '外注': 80000,
    };
    const unitPrice = unitPrices[content] || 35000;

    // 数量（1〜5本）
    const quantity = Math.floor(Math.random() * 5) + 1;

    // 請求済フラグ（納品済みの10件は請求済み）
    const isInvoiced = isDelivered && i < 10;

    // 備考をランダムに選択
    const noteIndex = Math.floor(Math.random() * NOTES_PATTERNS.length);
    const note = NOTES_PATTERNS[noteIndex];

    const record: { fields: Record<string, unknown> } = {
      fields: {
        '案件名': PROJECT_NAMES[i],
        '内容': content,
        '数量': quantity,
        '単価': unitPrice,
        '初稿予定日': scheduledDate.getTime(),
        '案件状況': status,
        'クライアント名': client,
        '請求済': isInvoiced,
      },
    };

    // 納品済みの場合は提出日と請求日を設定
    if (isDelivered) {
      record.fields['初稿提出日'] = submissionDate.getTime();
      record.fields['請求日'] = invoiceDate.getTime();
    }

    // 備考がある場合のみ追加
    if (note) {
      record.fields['備考'] = note;
    }

    records.push(record);
  }

  return records;
}

async function main() {
  console.log('\n🎬 YouTubeショート制作 デモデータ登録\n');
  console.log('='.repeat(60));

  const client = createLarkBaseClient({
    appId: process.env.LARK_APP_ID || LARKBASE_CONFIG.appId,
    appSecret: process.env.LARK_APP_SECRET || LARKBASE_CONFIG.appSecret,
    baseId: LARKBASE_CONFIG.baseId,
    tableId: LARKBASE_CONFIG.tableId,
  });

  // デモデータ生成
  const demoData = generateDemoData();

  console.log(`\n📝 ${demoData.length} 件のデモデータを生成しました\n`);

  // プレビュー表示
  console.log('--- データプレビュー ---\n');
  console.log('| No. | 案件名 | クライアント | 内容 | 数量 | 単価 | 状況 |');
  console.log('|-----|--------|------------|------|------|------|------|');

  for (let i = 0; i < Math.min(10, demoData.length); i++) {
    const f = demoData[i].fields;
    const projectName = String(f['案件名']).slice(0, 25);
    const clientName = String(f['クライアント名']).slice(0, 12);
    console.log(
      `| ${String(i + 1).padStart(3)} | ${projectName.padEnd(25)} | ${clientName.padEnd(12)} | ${String(f['内容']).padEnd(8)} | ${String(f['数量']).padStart(4)} | ¥${Number(f['単価']).toLocaleString().padStart(6)} | ${String(f['案件状況']).padEnd(4)} |`
    );
  }
  if (demoData.length > 10) {
    console.log(`| ... | ... 他 ${demoData.length - 10} 件 ... |`);
  }

  // バッチ登録
  console.log('\n📤 LarkBaseに登録中...\n');

  const result = await client.batchCreateRecords(demoData);

  if (!result.success) {
    console.error('❌ エラー:', result.error);
    return;
  }

  console.log(`✅ ${demoData.length} 件のデモデータを登録しました！\n`);

  // サマリー
  const summary = {
    clients: new Map<string, { count: number; amount: number }>(),
    totalAmount: 0,
    invoiced: 0,
    uninvoiced: 0,
  };

  for (const record of demoData) {
    const f = record.fields;
    const clientName = String(f['クライアント名']);
    const amount = Number(f['数量']) * Number(f['単価']);
    const isInvoiced = Boolean(f['請求済']);

    if (!summary.clients.has(clientName)) {
      summary.clients.set(clientName, { count: 0, amount: 0 });
    }
    const clientData = summary.clients.get(clientName)!;
    clientData.count++;
    clientData.amount += amount;

    summary.totalAmount += amount;
    if (isInvoiced) {
      summary.invoiced += amount;
    } else {
      summary.uninvoiced += amount;
    }
  }

  console.log('📊 登録データサマリー\n');
  console.log('【クライアント別】');
  for (const [name, data] of summary.clients) {
    console.log(`  ${name}: ${data.count}件 / ¥${data.amount.toLocaleString()}`);
  }

  console.log(`\n💰 合計金額: ¥${summary.totalAmount.toLocaleString()}`);
  console.log(`   請求済: ¥${summary.invoiced.toLocaleString()}`);
  console.log(`   未請求: ¥${summary.uninvoiced.toLocaleString()}`);

  console.log('\n📅 期間: 2026年1月〜3月');

  console.log('\n' + '='.repeat(60));
  console.log('✅ デモデータ登録完了\n');
}

main().catch((error) => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
