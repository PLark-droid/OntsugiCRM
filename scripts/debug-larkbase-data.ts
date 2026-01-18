/**
 * LarkBaseデータデバッグスクリプト
 */

import 'dotenv/config';
import { createLarkBaseClient } from '../src/api/larkbase.js';
import { LARKBASE_CONFIG } from '../src/config/larkbase-mapping.js';

async function main() {
  const client = createLarkBaseClient({
    appId: process.env.LARK_APP_ID || LARKBASE_CONFIG.appId,
    appSecret: process.env.LARK_APP_SECRET || LARKBASE_CONFIG.appSecret,
    baseId: LARKBASE_CONFIG.baseId,
    tableId: LARKBASE_CONFIG.tableId,
  });

  console.log('\n📋 LarkBase生データ取得\n');

  const result = await client.listRecords({ pageSize: 5 });

  if (!result.success) {
    console.error('❌ エラー:', result.error);
    return;
  }

  console.log('--- レコード数:', result.data?.items.length);

  for (let i = 0; i < Math.min(3, result.data?.items.length || 0); i++) {
    const record = result.data!.items[i];
    console.log(`\n--- レコード ${i + 1} ---`);
    console.log('record_id:', record.record_id);
    console.log('fields:');

    const fields = record.fields as Record<string, unknown>;
    for (const [key, value] of Object.entries(fields)) {
      console.log(`  "${key}":`, JSON.stringify(value));
    }
  }
}

main().catch(console.error);
