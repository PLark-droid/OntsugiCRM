/**
 * LarkBase接続テストスクリプト
 *
 * LarkBaseからデータを取得し、請求書グルーピングをテスト
 */

import 'dotenv/config';
import { createLarkBaseClient } from '../src/api/larkbase.js';
import { createProjectItemService } from '../src/services/project-item.service.js';
import { createLarkBaseInvoiceService } from '../src/services/larkbase-invoice.service.js';
import { LARKBASE_CONFIG } from '../src/config/larkbase-mapping.js';

async function main() {
  console.log('\n🔗 LarkBase接続テスト\n');
  console.log('='.repeat(60));

  // LarkBaseクライアント初期化
  const client = createLarkBaseClient({
    appId: process.env.LARK_APP_ID || LARKBASE_CONFIG.appId,
    appSecret: process.env.LARK_APP_SECRET || LARKBASE_CONFIG.appSecret,
    baseId: LARKBASE_CONFIG.baseId,
    tableId: LARKBASE_CONFIG.tableId,
  });

  const projectItemService = createProjectItemService(client);
  const invoiceService = createLarkBaseInvoiceService(projectItemService);

  // 1. 案件明細一覧取得
  console.log('\n📋 案件明細一覧を取得中...\n');

  const listResult = await projectItemService.list({ pageSize: 100 });

  if (!listResult.success) {
    console.error('❌ エラー:', listResult.error);
    return;
  }

  console.log(`✅ ${listResult.data!.items.length} 件の案件明細を取得\n`);

  // テーブル形式で表示
  console.log('| 案件名 | 内容 | 数量 | 単価 | 金額 | 状況 | 請求済 | クライアント |');
  console.log('|--------|------|------|------|------|------|--------|------------|');

  for (const item of listResult.data!.items.slice(0, 10)) {
    console.log(
      `| ${item.projectName.slice(0, 15).padEnd(15)} | ${item.contentType.padEnd(10)} | ${String(item.quantity).padStart(4)} | ¥${item.unitPrice.toLocaleString().padStart(8)} | ¥${item.amount.toLocaleString().padStart(10)} | ${item.status.padEnd(6)} | ${item.isInvoiced ? '✓' : ' '} | ${item.clientName.slice(0, 10)} |`
    );
  }

  if (listResult.data!.items.length > 10) {
    console.log(`| ... 他 ${listResult.data!.items.length - 10} 件 |`);
  }

  // 2. クライアント別集計
  console.log('\n📊 クライアント別集計\n');

  const summaryResult = await projectItemService.getSummaryByClient();

  if (summaryResult.success && summaryResult.data) {
    console.log('| クライアント | 件数 | 合計金額 | 請求済 | 未請求 |');
    console.log('|------------|------|----------|--------|--------|');

    for (const summary of summaryResult.data) {
      console.log(
        `| ${summary.clientName.slice(0, 15).padEnd(15)} | ${String(summary.itemCount).padStart(4)} | ¥${summary.totalAmount.toLocaleString().padStart(10)} | ¥${summary.invoicedAmount.toLocaleString().padStart(10)} | ¥${summary.unInvoicedAmount.toLocaleString().padStart(10)} |`
      );
    }
  }

  // 3. 請求書グルーピング（クライアント×月）
  console.log('\n📄 請求書プレビュー（クライアント×月）\n');

  const previewsResult = await invoiceService.getInvoicePreviews({
    onlyUnInvoiced: false,
  });

  if (previewsResult.success && previewsResult.data) {
    console.log('| クライアント | 請求月 | 件数 | 小計 | 消費税 | 合計 |');
    console.log('|------------|--------|------|------|--------|------|');

    for (const preview of previewsResult.data.slice(0, 10)) {
      console.log(
        `| ${preview.clientName.slice(0, 15).padEnd(15)} | ${preview.invoiceMonth.padEnd(10)} | ${String(preview.itemCount).padStart(4)} | ¥${preview.subtotal.toLocaleString().padStart(10)} | ¥${preview.taxAmount.toLocaleString().padStart(8)} | ¥${preview.totalAmount.toLocaleString().padStart(10)} |`
      );
    }
  }

  // 4. 未請求案件の確認
  console.log('\n⚠️  未請求案件\n');

  const uninvoicedResult = await projectItemService.list({
    pageSize: 100,
    isInvoiced: false,
  });

  if (uninvoicedResult.success && uninvoicedResult.data) {
    const uninvoiced = uninvoicedResult.data.items.filter(
      (item) => item.status === '納品'
    );

    if (uninvoiced.length > 0) {
      console.log(`🔴 納品済み・未請求: ${uninvoiced.length} 件\n`);

      for (const item of uninvoiced.slice(0, 5)) {
        console.log(`  - ${item.clientName}: ${item.projectName} (¥${item.amount.toLocaleString()})`);
      }
    } else {
      console.log('✅ 納品済み・未請求の案件はありません');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ LarkBase接続テスト完了\n');
}

main().catch((error) => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
