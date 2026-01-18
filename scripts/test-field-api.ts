/**
 * LarkBase フィールドAPI テスト
 */
import 'dotenv/config';

const LARK_APP_ID = process.env.LARK_APP_ID!;
const LARK_APP_SECRET = process.env.LARK_APP_SECRET!;
const BASE_ID = 'Opspbp1j1a54YNsZ3kaj2hfMpJe';
const TABLE_ID = 'tblALCtB4FaCjUjm';

const API_BASE = 'https://open.larksuite.com/open-apis';

async function getAccessToken(): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: LARK_APP_ID,
      app_secret: LARK_APP_SECRET,
    }),
  });
  const data = await response.json() as { tenant_access_token: string };
  return data.tenant_access_token;
}

async function main() {
  const token = await getAccessToken();
  console.log('Token:', token ? '取得成功' : 'エラー');

  // フィールド一覧を取得
  const url = `${API_BASE}/bitable/v1/apps/${BASE_ID}/tables/${TABLE_ID}/fields`;
  console.log('URL:', url);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log('Status:', response.status);
  const data = await response.json() as {
    data?: {
      items?: Array<{
        field_name: string;
        field_id: string;
        type: number;
        property?: { options?: Array<{ name: string; id: string }> };
      }>;
    };
  };

  if (data.data?.items) {
    console.log('\n📋 フィールド一覧:');
    for (const field of data.data.items) {
      console.log(`  ${field.field_name} (${field.field_id}) - type: ${field.type}`);
      if (field.property?.options) {
        console.log('    選択肢:');
        for (const opt of field.property.options) {
          console.log(`      - ${opt.name} (${opt.id})`);
        }
      }
    }
  } else {
    console.log('Response:', JSON.stringify(data, null, 2));
  }
}

main().catch(console.error);
