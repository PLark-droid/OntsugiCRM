/**
 * LarkBase クライアント選択肢追加スクリプト
 */

import 'dotenv/config';

const LARK_APP_ID = process.env.LARK_APP_ID!;
const LARK_APP_SECRET = process.env.LARK_APP_SECRET!;
const BASE_ID = 'Opspbp1j1a54YNsZ3kaj2hfMpJe';
const TABLE_ID = 'tblALCtB4FaCjUjm';
const FIELD_ID = 'fldNGusZwK'; // クライアント名フィールド

const API_BASE = 'https://open.larksuite.com/open-apis';

// 追加するクライアント（YouTubeショート制作会社向け架空クライアント）
const NEW_CLIENTS = [
  '株式会社バズクリエイト',
  '合同会社ショートムービーズ',
  'TikTok Master株式会社',
  '株式会社インフルエンサーラボ',
  'クリエイターズギルド合同会社',
];

async function getAccessToken(): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: LARK_APP_ID,
      app_secret: LARK_APP_SECRET,
    }),
  });

  const data = await response.json() as { code: number; msg?: string; tenant_access_token: string };
  if (data.code !== 0) {
    throw new Error(`Token error: ${data.msg}`);
  }
  return data.tenant_access_token;
}

async function getFieldInfo(token: string) {
  const response = await fetch(
    `${API_BASE}/bitable/v1/apps/${BASE_ID}/tables/${TABLE_ID}/fields/${FIELD_ID}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error('Response:', text);
    throw new Error('Failed to parse response');
  }
}

async function updateFieldOptions(token: string, existingOptions: Array<{ name: string; color?: number }>) {
  // 既存のオプションに新しいクライアントを追加
  const colors = [33, 37, 34, 39, 45]; // 色のバリエーション

  const newOptions = NEW_CLIENTS.map((name, index) => ({
    name,
    color: colors[index % colors.length],
  }));

  const allOptions = [...existingOptions, ...newOptions];

  const response = await fetch(
    `${API_BASE}/bitable/v1/apps/${BASE_ID}/tables/${TABLE_ID}/fields/${FIELD_ID}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        field_name: 'クライアント名',
        type: 3, // SingleSelect
        property: {
          options: allOptions,
        },
      }),
    }
  );

  return response.json() as Promise<{ code: number; msg?: string }>;
}

async function main() {
  console.log('\n🔧 クライアント選択肢を追加中...\n');

  const token = await getAccessToken();
  console.log('✅ 認証成功');

  // 現在のフィールド情報を取得
  const fieldInfo = await getFieldInfo(token);
  console.log('\n現在のクライアント選択肢:');

  if (fieldInfo.data?.field?.property?.options) {
    const existingOptions = fieldInfo.data.field.property.options;
    for (const opt of existingOptions) {
      console.log(`  - ${opt.name}`);
    }

    // 新しいオプションを追加
    console.log('\n追加するクライアント:');
    for (const name of NEW_CLIENTS) {
      console.log(`  + ${name}`);
    }

    const result = await updateFieldOptions(token, existingOptions);

    if (result.code === 0) {
      console.log('\n✅ クライアント選択肢を追加しました！');
    } else {
      console.error('\n❌ エラー:', result.msg);
    }
  } else {
    console.error('フィールド情報の取得に失敗:', fieldInfo);
  }
}

main().catch(console.error);
