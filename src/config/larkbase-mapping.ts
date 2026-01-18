/**
 * LarkBase フィールドマッピング設定
 *
 * LarkBase Table: tblALCtB4FaCjUjm
 * Base ID: Opspbp1j1a54YNsZ3kaj2hfMpJe
 */

// フィールドID → CRMフィールド名のマッピング
export const FIELD_MAPPING = {
  // LarkBase Field ID → CRM Field Name
  fldsEAODet: 'projectName',      // 案件名
  fldFqQ6fyi: 'contentType',      // 内容（単一選択）
  fldBpTG6Mo: 'quantity',         // 数量
  fldCfjiEcL: 'unitPrice',        // 単価
  fldu62IKHa: 'scheduledDate',    // 初校予定日
  fldSsARFOb: 'submissionDate',   // 初校提出日
  fldtyTtEtA: 'status',           // 案件状況
  fldhGAZMct: 'isInvoiced',       // 請求済
  fldNGusZwK: 'clientName',       // クライアント名
  fldJT46i7B: 'notes',            // 備考
  fldzylD3SI: 'invoiceDate',      // 請求日
  fldmysL31U: 'invoiceMonth',     // 請求月（ルックアップ）
  fldZPH9HUL: 'amount',           // 金額（数式：数量×単価）
} as const;

// CRMフィールド名 → LarkBase Field IDの逆マッピング
export const REVERSE_FIELD_MAPPING = {
  projectName: 'fldsEAODet',
  contentType: 'fldFqQ6fyi',
  quantity: 'fldBpTG6Mo',
  unitPrice: 'fldCfjiEcL',
  scheduledDate: 'fldu62IKHa',
  submissionDate: 'fldSsARFOb',
  status: 'fldtyTtEtA',
  isInvoiced: 'fldhGAZMct',
  clientName: 'fldNGusZwK',
  notes: 'fldJT46i7B',
  invoiceDate: 'fldzylD3SI',
  invoiceMonth: 'fldmysL31U',
  amount: 'fldZPH9HUL',
} as const;

// フィールド名（日本語）マッピング
export const FIELD_NAME_MAPPING = {
  projectName: '案件名',
  contentType: '内容',
  quantity: '数量',
  unitPrice: '単価',
  scheduledDate: '初稿予定日',
  submissionDate: '初稿提出日',
  status: '案件状況',
  isInvoiced: '請求済',
  clientName: 'クライアント名',
  notes: '備考',
  invoiceDate: '請求日',
  invoiceMonth: '請求月',
  amount: '金額',
} as const;

// 内容タイプ（単一選択の選択肢）
export const CONTENT_TYPES = {
  optMAjxj5s: '編集',
  optisbbNOf: 'ディレクション',
  optnL1bL4N: '運用',
  optCNvdTsA: '台本',
  optP2bm7Pz: '割引',
  optxpXEpv8: '外注',
} as const;

export type ContentType = typeof CONTENT_TYPES[keyof typeof CONTENT_TYPES];

// 案件状況（単一選択の選択肢）
export const PROJECT_STATUS = {
  optgqP8D2q: '未着手',
  opt7SmM9bO: '着手中',
  optTCcyPtY: '提出',
  optgmjr8Pl: '修正中',
  optjjgEx93: '納品',
  optf82hw6h: '割引',
  optd4Jypba: 'ストック',
} as const;

export type ProjectStatus = typeof PROJECT_STATUS[keyof typeof PROJECT_STATUS];

// クライアント名（単一選択の選択肢）
export const CLIENTS = {
  optzCHcGFC: '中村 香菜枝様',
  optNqQH1Qv: '株式会社ontsugi',
  opt31B8QvO: '上野 優作様',
  optiSSOkCK: '株式会社 マウントブラン',
} as const;

export type ClientName = typeof CLIENTS[keyof typeof CLIENTS];

// LarkBase設定
export const LARKBASE_CONFIG = {
  baseId: process.env.LARK_BASE_ID || 'Opspbp1j1a54YNsZ3kaj2hfMpJe',
  tableId: process.env.LARK_TABLE_ID || 'tblALCtB4FaCjUjm',
  appId: process.env.LARK_APP_ID || '',
  appSecret: process.env.LARK_APP_SECRET || '',
  region: 'global' as const,  // 'global' or 'china'
};

// CRM案件明細の型定義
export interface ProjectItem {
  recordId: string;           // LarkBase record_id
  projectName: string;        // 案件名
  contentType: ContentType;   // 内容
  quantity: number;           // 数量
  unitPrice: number;          // 単価
  amount: number;             // 金額（計算値）
  scheduledDate?: Date;       // 初校予定日
  submissionDate?: Date;      // 初校提出日
  status: ProjectStatus;      // 案件状況
  isInvoiced: boolean;        // 請求済
  clientName: ClientName;     // クライアント名
  notes?: string;             // 備考
  invoiceDate?: Date;         // 請求日
  invoiceMonth?: string;      // 請求月
  createdAt?: Date;
  updatedAt?: Date;
}

// 請求書グルーピング設定
export const INVOICE_GROUPING = {
  // クライアント × 月 単位でグルーピング
  groupBy: ['clientName', 'invoiceMonth'] as const,

  // 請求書に含める条件
  includeConditions: {
    status: ['納品'],           // 納品済みの案件のみ
    isInvoiced: false,          // 未請求のもの
  },
};

// freee会計エクスポート設定
export const FREEE_EXPORT_CONFIG = {
  // 勘定科目マッピング
  accounts: {
    売掛金: '売掛金',
    売上高: '売上高',
    仮受消費税: '仮受消費税',
    普通預金: '普通預金',
  },
  // 税率設定
  taxRate: 0.1,  // 10%
  // 摘要フォーマット
  descriptionFormat: '{clientName} {invoiceMonth} {projectName}',
};
