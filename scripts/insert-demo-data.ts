/**
 * LarkBase デモデータ登録スクリプト
 *
 * 請求書トラッカーテーブルに20件のデモデータを登録
 */

import 'dotenv/config';
import { createLarkBaseClient } from '../src/api/larkbase.js';
import { LARKBASE_CONFIG } from '../src/config/larkbase-mapping.js';

// フィールド選択肢
const CONTENT_OPTIONS = ['編集', 'ディレクション', '運用', '台本', '外注'];
const STATUS_OPTIONS = ['未着手', '着手中', '提出', '修正中', '納品'];
const CLIENT_OPTIONS = [
  '中村 香菜枝様',
  '株式会社ontsugi',
  '上野 優作様',
  '株式会社 マウントブラン',
];

// デモデータ生成
function generateDemoData(): Array<{ fields: Record<string, unknown> }> {
  const records: Array<{ fields: Record<string, unknown> }> = [];

  // 案件名のベース
  const projectNames = [
    'Webサイトリニューアル',
    'ECサイト構築',
    'LP制作',
    'コーポレートサイト制作',
    'アプリUI設計',
    'SNS運用代行',
    '動画制作',
    'バナー制作',
    'SEO対策',
    'コンテンツマーケティング',
    'メルマガ配信',
    'プレスリリース作成',
    'ブランディング',
    'ロゴデザイン',
    '名刺デザイン',
    'パンフレット制作',
    'イベント企画',
    '広告運用',
    'データ分析',
    'システム開発',
  ];

  // 2024年11月〜2025年1月のデータを生成
  const months = [
    { year: 2024, month: 11 },
    { year: 2024, month: 12 },
    { year: 2025, month: 1 },
  ];

  for (let i = 0; i < 20; i++) {
    const monthData = months[i % 3];
    const day = Math.floor(Math.random() * 25) + 1;
    const baseDate = new Date(monthData.year, monthData.month - 1, day);

    // ランダムな選択
    const clientIndex = i % CLIENT_OPTIONS.length;
    const contentIndex = i % CONTENT_OPTIONS.length;
    const statusIndex = i < 15 ? 4 : i % STATUS_OPTIONS.length; // 15件は納品済み

    // 単価設定（内容によって異なる）
    const unitPrices: Record<string, number> = {
      '編集': 50000,
      'ディレクション': 80000,
      '運用': 30000,
      '台本': 40000,
      '外注': 100000,
    };
    const unitPrice = unitPrices[CONTENT_OPTIONS[contentIndex]] || 50000;

    // 数量（1〜5）
    const quantity = Math.floor(Math.random() * 5) + 1;

    // 日付計算
    const scheduledDate = new Date(baseDate);
    scheduledDate.setDate(scheduledDate.getDate() + 7);

    const submissionDate = new Date(scheduledDate);
    submissionDate.setDate(submissionDate.getDate() + Math.floor(Math.random() * 5));

    // 請求日（納品済みの場合のみ）
    const isDelivered = STATUS_OPTIONS[statusIndex] === '納品';
    const invoiceDate = isDelivered
      ? new Date(submissionDate.getTime() + 3 * 24 * 60 * 60 * 1000)
      : null;

    // 請求済フラグ（納品済みの一部）
    const isInvoiced = isDelivered && i < 10;

    const record = {
      fields: {
        '案件名': `${projectNames[i]} - ${CLIENT_OPTIONS[clientIndex].replace('様', '').replace('株式会社', '')}`,
        '内容': CONTENT_OPTIONS[contentIndex],
        '数量': quantity,
        '単価': unitPrice,
        '初稿予定日': scheduledDate.getTime(),
        '初稿提出日': isDelivered ? submissionDate.getTime() : null,
        '案件状況': STATUS_OPTIONS[statusIndex],
        '請求済': isInvoiced,
        'クライアント名': CLIENT_OPTIONS[clientIndex],
        '備考': i % 3 === 0 ? `備考: ${projectNames[i]}に関する追加情報` : null,
        '請求日': invoiceDate ? invoiceDate.getTime() : null,
      },
    };

    // nullフィールドを削除
    const fields = record.fields as Record<string, unknown>;
    Object.keys(fields).forEach(key => {
      if (fields[key] === null) {
        delete fields[key];
      }
    });

    records.push(record);
  }

  return records;
}

async function main() {
  console.log('\n🚀 LarkBase デモデータ登録\n');
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
  console.log('--- データプレビュー（最初の5件）---\n');
  console.log('| No. | 案件名 | クライアント | 内容 | 数量 | 単価 | 状況 |');
  console.log('|-----|--------|------------|------|------|------|------|');

  for (let i = 0; i < 5; i++) {
    const f = demoData[i].fields;
    console.log(
      `| ${String(i + 1).padStart(3)} | ${String(f['案件名']).slice(0, 20).padEnd(20)} | ${String(f['クライアント名']).slice(0, 10).padEnd(10)} | ${String(f['内容']).padEnd(10)} | ${String(f['数量']).padStart(4)} | ¥${Number(f['単価']).toLocaleString().padStart(7)} | ${String(f['案件状況']).padEnd(6)} |`
    );
  }
  console.log('| ... | ... | ... | ... | ... | ... | ... |');

  // バッチ登録
  console.log('\n📤 LarkBaseに登録中...\n');

  const result = await client.batchCreateRecords(demoData);

  if (!result.success) {
    console.error('❌ エラー:', result.error);
    return;
  }

  console.log(`✅ ${demoData.length} 件のデモデータを登録しました！\n`);

  // 登録結果サマリー
  const summary = {
    clients: new Map<string, number>(),
    statuses: new Map<string, number>(),
    contents: new Map<string, number>(),
    totalAmount: 0,
  };

  for (const record of demoData) {
    const f = record.fields;
    const client = String(f['クライアント名']);
    const status = String(f['案件状況']);
    const content = String(f['内容']);
    const amount = Number(f['数量']) * Number(f['単価']);

    summary.clients.set(client, (summary.clients.get(client) || 0) + 1);
    summary.statuses.set(status, (summary.statuses.get(status) || 0) + 1);
    summary.contents.set(content, (summary.contents.get(content) || 0) + 1);
    summary.totalAmount += amount;
  }

  console.log('📊 登録データサマリー\n');

  console.log('【クライアント別】');
  for (const [client, count] of summary.clients) {
    console.log(`  ${client}: ${count} 件`);
  }

  console.log('\n【ステータス別】');
  for (const [status, count] of summary.statuses) {
    console.log(`  ${status}: ${count} 件`);
  }

  console.log('\n【内容別】');
  for (const [content, count] of summary.contents) {
    console.log(`  ${content}: ${count} 件`);
  }

  console.log(`\n💰 合計金額: ¥${summary.totalAmount.toLocaleString()}`);

  console.log('\n' + '='.repeat(60));
  console.log('✅ デモデータ登録完了\n');
}

main().catch((error) => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
