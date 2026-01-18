/**
 * LarkBase フィールド取得スクリプト
 */

const LARK_APP_ID = process.env.LARK_APP_ID || 'cli_a9d7a38447f8de1c';
const LARK_APP_SECRET = process.env.LARK_APP_SECRET || 'YrVAlbRPhVcnxwju76wlcgP7vdjIbh6J';
const BASE_ID = process.env.LARK_BASE_ID || 'Opspbp1j1a54YNsZ3kaj2hfMpJe';
const TABLE_ID = process.env.LARK_TABLE_ID || 'tblALCtB4FaCjUjm';

// Lark Suite Japan リージョン
const API_BASE = 'https://open.larksuite.com/open-apis';

interface TokenResponse {
  code: number;
  msg: string;
  tenant_access_token: string;
  expire: number;
}

interface FieldsResponse {
  code: number;
  msg: string;
  data: {
    items: Array<{
      field_id: string;
      field_name: string;
      type: number;
      property?: Record<string, unknown>;
    }>;
  };
}

// フィールドタイプのマッピング
const FIELD_TYPES: Record<number, string> = {
  1: 'テキスト',
  2: '数値',
  3: '単一選択',
  4: '複数選択',
  5: '日付',
  7: 'チェックボックス',
  11: 'ユーザー',
  13: '電話番号',
  15: 'URL',
  17: '添付ファイル',
  18: 'リンク（他テーブル）',
  19: 'ルックアップ',
  20: '数式',
  21: '双方向リンク',
  22: '場所',
  23: 'グループチャット',
  1001: '作成日時',
  1002: '更新日時',
  1003: '作成者',
  1004: '更新者',
  1005: '自動番号',
};

async function getAccessToken(): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: LARK_APP_ID,
      app_secret: LARK_APP_SECRET,
    }),
  });

  const data = await response.json() as TokenResponse;

  if (data.code !== 0) {
    throw new Error(`Failed to get token: ${data.msg}`);
  }

  return data.tenant_access_token;
}

async function getTableFields(token: string): Promise<void> {
  const response = await fetch(
    `${API_BASE}/bitable/v1/apps/${BASE_ID}/tables/${TABLE_ID}/fields`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json() as FieldsResponse;

  if (data.code !== 0) {
    throw new Error(`Failed to get fields: ${data.msg}`);
  }

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║           LarkBase テーブルフィールド一覧                     ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Base ID:  ${BASE_ID}                  ║`);
  console.log(`║  Table ID: ${TABLE_ID}                              ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log('| No. | フィールド名 | タイプ | フィールドID |');
  console.log('|-----|-------------|--------|--------------|');

  data.data.items.forEach((field, index) => {
    const typeName = FIELD_TYPES[field.type] || `不明(${field.type})`;
    console.log(
      `| ${String(index + 1).padStart(3)} | ${field.field_name.padEnd(20)} | ${typeName.padEnd(15)} | ${field.field_id} |`
    );
  });

  console.log('\n--- JSON形式 ---\n');
  console.log(JSON.stringify(data.data.items, null, 2));
}

async function main() {
  try {
    console.log('🔑 アクセストークンを取得中...');
    const token = await getAccessToken();
    console.log('✅ トークン取得成功\n');

    console.log('📋 テーブルフィールドを取得中...');
    await getTableFields(token);
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

main();
