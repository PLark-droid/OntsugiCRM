/**
 * OntsugiCRM - Entry Point
 *
 * LarkBaseをDBとした案件管理、見積、請求書発行、
 * freee会計インポート用CSVエクスポート機能を提供
 */

// Types
export type {
  Project,
  ProjectStatus,
  Client,
  Quote,
  QuoteItem,
  QuoteStatus,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  BankAccount,
  TaxCategory,
  FreeeJournalEntry,
  FreeeExportOptions,
  LarkBaseConfig,
  LarkBaseRecord,
  ApiResponse,
  ApiError,
  PaginatedResponse,
} from './types/index.js';

// API
export { LarkBaseClient, createLarkBaseClient } from './api/larkbase.js';

// Services
export {
  ProjectService,
  createProjectService,
  QuoteService,
  getQuoteService,
  InvoiceService,
  getInvoiceService,
  FreeeExportService,
  getFreeeExportService,
} from './services/index.js';

// Utils
export {
  generateQuoteHTML,
  generateInvoiceHTML,
  generatePDF,
  saveHTMLToFile,
  formatCurrency,
  formatDate,
  type PDFOptions,
  type CompanyInfo,
} from './utils/pdf-generator.js';

/**
 * OntsugiCRM アプリケーション
 */
export class OntsugiCRM {
  private static instance: OntsugiCRM;

  private constructor() {}

  static getInstance(): OntsugiCRM {
    if (!OntsugiCRM.instance) {
      OntsugiCRM.instance = new OntsugiCRM();
    }
    return OntsugiCRM.instance;
  }

  /**
   * アプリケーション情報
   */
  getInfo(): { name: string; version: string; description: string } {
    return {
      name: 'OntsugiCRM',
      version: '0.1.0',
      description: 'LarkBaseをDBとした案件管理・見積・請求書発行システム',
    };
  }
}

// CLI エントリポイント
async function main(): Promise<void> {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║   🌸 OntsugiCRM - 案件管理・見積・請求書発行システム      ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('✨ 主な機能:');
  console.log('   ├── 📊 案件管理 (LarkBase連携)');
  console.log('   ├── 📝 見積書作成・PDF出力');
  console.log('   ├── 💰 請求書発行・PDF出力');
  console.log('   └── 📤 freee会計 CSVエクスポート');
  console.log('');
  console.log('📚 使用方法:');
  console.log('');
  console.log('   // LarkBase クライアントの初期化');
  console.log('   import { createLarkBaseClient, createProjectService } from "ontsugi-crm";');
  console.log('');
  console.log('   const client = createLarkBaseClient({');
  console.log('     appId: process.env.LARK_APP_ID,');
  console.log('     appSecret: process.env.LARK_APP_SECRET,');
  console.log('     baseId: "your-base-id",');
  console.log('     tableId: "your-table-id",');
  console.log('   });');
  console.log('');
  console.log('   const projectService = createProjectService(client);');
  console.log('   const projects = await projectService.list();');
  console.log('');
  console.log('🔧 環境変数:');
  console.log('   LARK_APP_ID      - LarkアプリID');
  console.log('   LARK_APP_SECRET  - Larkアプリシークレット');
  console.log('');
  console.log('📖 詳細はREADME.mdをご覧ください');
  console.log('');
}

// Run main if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}
