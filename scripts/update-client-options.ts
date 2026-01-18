/**
 * LarkBase クライアント選択肢を設定するスクリプト
 */
import 'dotenv/config';

const LARK_APP_ID = process.env.LARK_APP_ID!;
const LARK_APP_SECRET = process.env.LARK_APP_SECRET!;
const BASE_ID = 'Opspbp1j1a54YNsZ3kaj2hfMpJe';
const TABLE_ID = 'tblALCtB4FaCjUjm';
const CLIENT_FIELD_ID = 'fldNGusZwK';

const API_BASE = 'https://open.larksuite.com/open-apis';

// 新しいクライアント（架空の5社）
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

async function main() {
  console.log('\n🔧 クライアント選択肢を設定中...\n');

  const token = await getAccessToken();
  console.log('✅ 認証成功');

  // 新しいオプションを作成
  const colors = [0, 1, 2, 3, 4]; // LarkBaseの色ID
  const options = NEW_CLIENTS.map((name, index) => ({
    name,
    color: colors[index % colors.length],
  }));

  console.log('\n📝 設定するクライアント:');
  for (const opt of options) {
    console.log(`  - ${opt.name}`);
  }

  // フィールドを更新
  const url = `${API_BASE}/bitable/v1/apps/${BASE_ID}/tables/${TABLE_ID}/fields/${CLIENT_FIELD_ID}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      field_name: 'クライアント名',
      type: 3, // SingleSelect
      property: {
        options,
      },
    }),
  });

  const result = await response.json() as {
    code: number;
    msg?: string;
    data?: { field?: { property?: { options?: Array<{ name: string; id: string }> } } };
  };

  if (result.code === 0) {
    console.log('\n✅ クライアント選択肢を設定しました！');

    // 設定結果を表示
    if (result.data?.field?.property?.options) {
      console.log('\n📋 設定された選択肢:');
      for (const opt of result.data.field.property.options) {
        console.log(`  - ${opt.name} (${opt.id})`);
      }
    }
  } else {
    console.error('\n❌ エラー:', result.code, result.msg);
    console.error('詳細:', JSON.stringify(result, null, 2));
  }
}

main().catch(console.error);
