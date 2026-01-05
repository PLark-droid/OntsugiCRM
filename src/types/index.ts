/**
 * OntsugiCRM - 型定義
 */

// ========================================
// LarkBase関連
// ========================================

export interface LarkBaseConfig {
  appId: string;
  appSecret: string;
  baseId: string;
  tableId: string;
}

export interface LarkBaseRecord {
  record_id: string;
  fields: Record<string, unknown>;
  created_time?: number;
  last_modified_time?: number;
}

// ========================================
// 案件管理
// ========================================

export interface Project {
  id: string;
  projectNumber: string;        // 案件番号
  name: string;                 // 案件名
  clientId: string;             // 顧客ID
  clientName: string;           // 顧客名
  status: ProjectStatus;        // ステータス
  description?: string;         // 説明
  startDate?: Date;             // 開始日
  endDate?: Date;               // 終了日
  totalAmount: number;          // 合計金額
  createdAt: Date;
  updatedAt: Date;
}

export type ProjectStatus =
  | '見込み'
  | '商談中'
  | '受注'
  | '進行中'
  | '完了'
  | '失注'
  | 'キャンセル';

// ========================================
// 顧客管理
// ========================================

export interface Client {
  id: string;
  name: string;                 // 顧客名
  companyName?: string;         // 会社名
  email?: string;               // メールアドレス
  phone?: string;               // 電話番号
  address?: string;             // 住所
  postalCode?: string;          // 郵便番号
  taxId?: string;               // 適格請求書発行事業者登録番号
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// 見積
// ========================================

export interface Quote {
  id: string;
  quoteNumber: string;          // 見積番号
  projectId: string;            // 案件ID
  clientId: string;             // 顧客ID
  status: QuoteStatus;          // ステータス
  issueDate: Date;              // 発行日
  validUntil: Date;             // 有効期限
  items: QuoteItem[];           // 明細
  subtotal: number;             // 小計
  taxRate: number;              // 税率
  taxAmount: number;            // 消費税額
  totalAmount: number;          // 合計金額
  notes?: string;               // 備考
  createdAt: Date;
  updatedAt: Date;
}

export interface QuoteItem {
  id: string;
  description: string;          // 品目・説明
  quantity: number;             // 数量
  unit: string;                 // 単位
  unitPrice: number;            // 単価
  amount: number;               // 金額
  taxable: boolean;             // 課税対象
}

export type QuoteStatus =
  | '下書き'
  | '送付済み'
  | '承認待ち'
  | '承認済み'
  | '失効'
  | 'キャンセル';

// ========================================
// 請求書
// ========================================

export interface Invoice {
  id: string;
  invoiceNumber: string;        // 請求書番号
  projectId: string;            // 案件ID
  quoteId?: string;             // 見積ID（関連）
  clientId: string;             // 顧客ID
  status: InvoiceStatus;        // ステータス
  issueDate: Date;              // 発行日
  dueDate: Date;                // 支払期日
  items: InvoiceItem[];         // 明細
  subtotal: number;             // 小計
  taxRate: number;              // 税率
  taxAmount: number;            // 消費税額
  totalAmount: number;          // 合計金額
  paidAmount: number;           // 入金済み金額
  notes?: string;               // 備考
  paymentTerms?: string;        // 支払条件
  bankAccount?: BankAccount;    // 振込先
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id: string;
  description: string;          // 品目・説明
  quantity: number;             // 数量
  unit: string;                 // 単位
  unitPrice: number;            // 単価
  amount: number;               // 金額
  taxable: boolean;             // 課税対象
  taxCategory: TaxCategory;     // 税区分
}

export interface BankAccount {
  bankName: string;             // 銀行名
  branchName: string;           // 支店名
  accountType: '普通' | '当座'; // 口座種別
  accountNumber: string;        // 口座番号
  accountHolder: string;        // 口座名義
}

export type InvoiceStatus =
  | '下書き'
  | '発行済み'
  | '送付済み'
  | '一部入金'
  | '入金済み'
  | '過払い'
  | '未回収'
  | 'キャンセル';

export type TaxCategory =
  | '課税売上10%'
  | '課税売上8%（軽減税率）'
  | '非課税売上'
  | '不課税売上';

// ========================================
// freee会計連携
// ========================================

export interface FreeeJournalEntry {
  取引日: string;               // YYYY-MM-DD
  借方勘定科目: string;
  借方補助科目?: string;
  借方部門?: string;
  借方金額: number;
  借方税区分: string;
  貸方勘定科目: string;
  貸方補助科目?: string;
  貸方部門?: string;
  貸方金額: number;
  貸方税区分: string;
  摘要: string;
  タグ?: string;
}

export interface FreeeExportOptions {
  startDate: Date;
  endDate: Date;
  includeUnpaid: boolean;       // 未入金も含める
  encoding: 'utf-8' | 'shift-jis';
}

// ========================================
// API レスポンス
// ========================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
