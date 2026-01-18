/**
 * PDF生成ユーティリティ
 *
 * 見積書・請求書のPDF生成
 */

import type { Quote, Invoice, Client, ApiResponse } from '../types/index.js';

// PDF生成オプション
export interface PDFOptions {
  paperSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

// デフォルトオプション
const DEFAULT_OPTIONS: PDFOptions = {
  paperSize: 'A4',
  orientation: 'portrait',
  margin: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20,
  },
};

// 会社情報
export interface CompanyInfo {
  name: string;
  address: string;
  postalCode: string;
  phone: string;
  email: string;
  taxId?: string; // 適格請求書発行事業者登録番号
  logo?: string;
}

/**
 * 金額を日本円形式にフォーマット
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(amount);
}

/**
 * 日付を日本語形式にフォーマット
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * 見積書HTMLテンプレート生成
 */
export function generateQuoteHTML(
  quote: Quote,
  client: Client,
  company: CompanyInfo
): string {
  const itemsHTML = quote.items
    .map(
      (item, index) => `
    <tr>
      <td class="index">${index + 1}</td>
      <td class="description">${escapeHTML(item.description)}</td>
      <td class="quantity">${item.quantity}</td>
      <td class="unit">${escapeHTML(item.unit)}</td>
      <td class="price">${formatCurrency(item.unitPrice)}</td>
      <td class="amount">${formatCurrency(item.amount)}</td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>見積書 ${quote.quoteNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      padding: 40px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .header h1 {
      font-size: 24px;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .client-info, .company-info {
      width: 45%;
    }
    .client-info h2, .company-info h2 {
      font-size: 14px;
      margin-bottom: 10px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 5px;
    }
    .quote-meta {
      margin-bottom: 20px;
    }
    .quote-meta table {
      margin-left: auto;
    }
    .quote-meta td {
      padding: 5px 10px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .items-table th, .items-table td {
      border: 1px solid #ccc;
      padding: 8px;
      text-align: left;
    }
    .items-table th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    .items-table .index { width: 5%; text-align: center; }
    .items-table .description { width: 40%; }
    .items-table .quantity { width: 10%; text-align: right; }
    .items-table .unit { width: 10%; text-align: center; }
    .items-table .price { width: 15%; text-align: right; }
    .items-table .amount { width: 20%; text-align: right; }
    .totals {
      width: 300px;
      margin-left: auto;
      margin-bottom: 30px;
    }
    .totals table {
      width: 100%;
      border-collapse: collapse;
    }
    .totals td {
      padding: 8px;
      border: 1px solid #ccc;
    }
    .totals .label { background-color: #f5f5f5; width: 40%; }
    .totals .value { text-align: right; font-weight: bold; }
    .totals .grand-total { font-size: 16px; background-color: #e8f4f8; }
    .notes {
      margin-top: 30px;
      padding: 15px;
      background-color: #f9f9f9;
      border: 1px solid #ddd;
    }
    .notes h3 {
      font-size: 12px;
      margin-bottom: 10px;
    }
    .validity {
      margin-top: 20px;
      font-size: 11px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>御 見 積 書</h1>
  </div>

  <div class="info-section">
    <div class="client-info">
      <h2>宛先</h2>
      <p><strong>${escapeHTML(client.companyName || client.name)} 御中</strong></p>
      ${client.address ? `<p>${escapeHTML(client.address)}</p>` : ''}
    </div>
    <div class="company-info">
      <h2>発行元</h2>
      <p><strong>${escapeHTML(company.name)}</strong></p>
      <p>〒${escapeHTML(company.postalCode)}</p>
      <p>${escapeHTML(company.address)}</p>
      <p>TEL: ${escapeHTML(company.phone)}</p>
      <p>Email: ${escapeHTML(company.email)}</p>
      ${company.taxId ? `<p>登録番号: ${escapeHTML(company.taxId)}</p>` : ''}
    </div>
  </div>

  <div class="quote-meta">
    <table>
      <tr>
        <td>見積番号:</td>
        <td><strong>${escapeHTML(quote.quoteNumber)}</strong></td>
      </tr>
      <tr>
        <td>発行日:</td>
        <td>${formatDate(quote.issueDate)}</td>
      </tr>
      <tr>
        <td>有効期限:</td>
        <td>${formatDate(quote.validUntil)}</td>
      </tr>
    </table>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th class="index">No.</th>
        <th class="description">品目・内容</th>
        <th class="quantity">数量</th>
        <th class="unit">単位</th>
        <th class="price">単価</th>
        <th class="amount">金額</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td class="label">小計</td>
        <td class="value">${formatCurrency(quote.subtotal)}</td>
      </tr>
      <tr>
        <td class="label">消費税（${Math.round(quote.taxRate * 100)}%）</td>
        <td class="value">${formatCurrency(quote.taxAmount)}</td>
      </tr>
      <tr>
        <td class="label grand-total">合計金額</td>
        <td class="value grand-total">${formatCurrency(quote.totalAmount)}</td>
      </tr>
    </table>
  </div>

  ${
    quote.notes
      ? `
  <div class="notes">
    <h3>備考</h3>
    <p>${escapeHTML(quote.notes).replace(/\n/g, '<br>')}</p>
  </div>
  `
      : ''
  }

  <div class="validity">
    <p>※ 本見積書の有効期限は ${formatDate(quote.validUntil)} までとなります。</p>
    <p>※ 上記金額には消費税が含まれております。</p>
  </div>
</body>
</html>
`;
}

/**
 * 請求書HTMLテンプレート生成
 */
export function generateInvoiceHTML(
  invoice: Invoice,
  client: Client,
  company: CompanyInfo
): string {
  const itemsHTML = invoice.items
    .map(
      (item, index) => `
    <tr>
      <td class="index">${index + 1}</td>
      <td class="description">${escapeHTML(item.description)}</td>
      <td class="quantity">${item.quantity}</td>
      <td class="unit">${escapeHTML(item.unit)}</td>
      <td class="price">${formatCurrency(item.unitPrice)}</td>
      <td class="amount">${formatCurrency(item.amount)}</td>
    </tr>
  `
    )
    .join('');

  const bankInfo = invoice.bankAccount;

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>請求書 ${invoice.invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      padding: 40px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .header h1 {
      font-size: 24px;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .client-info, .company-info {
      width: 45%;
    }
    .client-info h2, .company-info h2 {
      font-size: 14px;
      margin-bottom: 10px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 5px;
    }
    .invoice-meta {
      margin-bottom: 20px;
    }
    .invoice-meta table {
      margin-left: auto;
    }
    .invoice-meta td {
      padding: 5px 10px;
    }
    .total-box {
      background-color: #e8f4f8;
      border: 2px solid #0066cc;
      padding: 15px;
      margin-bottom: 30px;
      text-align: center;
    }
    .total-box .label {
      font-size: 14px;
      margin-bottom: 5px;
    }
    .total-box .amount {
      font-size: 24px;
      font-weight: bold;
      color: #0066cc;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .items-table th, .items-table td {
      border: 1px solid #ccc;
      padding: 8px;
      text-align: left;
    }
    .items-table th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    .items-table .index { width: 5%; text-align: center; }
    .items-table .description { width: 40%; }
    .items-table .quantity { width: 10%; text-align: right; }
    .items-table .unit { width: 10%; text-align: center; }
    .items-table .price { width: 15%; text-align: right; }
    .items-table .amount { width: 20%; text-align: right; }
    .totals {
      width: 300px;
      margin-left: auto;
      margin-bottom: 30px;
    }
    .totals table {
      width: 100%;
      border-collapse: collapse;
    }
    .totals td {
      padding: 8px;
      border: 1px solid #ccc;
    }
    .totals .label { background-color: #f5f5f5; width: 40%; }
    .totals .value { text-align: right; font-weight: bold; }
    .bank-info {
      margin-top: 30px;
      padding: 15px;
      background-color: #f9f9f9;
      border: 1px solid #ddd;
    }
    .bank-info h3 {
      font-size: 12px;
      margin-bottom: 10px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 5px;
    }
    .bank-info table td {
      padding: 3px 10px;
    }
    .notes {
      margin-top: 20px;
      padding: 15px;
      background-color: #fff9e6;
      border: 1px solid #f0c36d;
    }
    .notes h3 {
      font-size: 12px;
      margin-bottom: 10px;
    }
    .footer {
      margin-top: 30px;
      font-size: 11px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>請 求 書</h1>
  </div>

  <div class="info-section">
    <div class="client-info">
      <h2>請求先</h2>
      <p><strong>${escapeHTML(client.companyName || client.name)} 御中</strong></p>
      ${client.address ? `<p>${escapeHTML(client.address)}</p>` : ''}
    </div>
    <div class="company-info">
      <h2>発行元</h2>
      <p><strong>${escapeHTML(company.name)}</strong></p>
      <p>〒${escapeHTML(company.postalCode)}</p>
      <p>${escapeHTML(company.address)}</p>
      <p>TEL: ${escapeHTML(company.phone)}</p>
      <p>Email: ${escapeHTML(company.email)}</p>
      ${company.taxId ? `<p>登録番号: ${escapeHTML(company.taxId)}</p>` : ''}
    </div>
  </div>

  <div class="invoice-meta">
    <table>
      <tr>
        <td>請求書番号:</td>
        <td><strong>${escapeHTML(invoice.invoiceNumber)}</strong></td>
      </tr>
      <tr>
        <td>発行日:</td>
        <td>${formatDate(invoice.issueDate)}</td>
      </tr>
      <tr>
        <td>お支払期限:</td>
        <td><strong>${formatDate(invoice.dueDate)}</strong></td>
      </tr>
    </table>
  </div>

  <div class="total-box">
    <div class="label">ご請求金額（税込）</div>
    <div class="amount">${formatCurrency(invoice.totalAmount)}</div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th class="index">No.</th>
        <th class="description">品目・内容</th>
        <th class="quantity">数量</th>
        <th class="unit">単位</th>
        <th class="price">単価</th>
        <th class="amount">金額</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td class="label">小計</td>
        <td class="value">${formatCurrency(invoice.subtotal)}</td>
      </tr>
      <tr>
        <td class="label">消費税（${Math.round(invoice.taxRate * 100)}%）</td>
        <td class="value">${formatCurrency(invoice.taxAmount)}</td>
      </tr>
      <tr>
        <td class="label">合計</td>
        <td class="value">${formatCurrency(invoice.totalAmount)}</td>
      </tr>
    </table>
  </div>

  ${
    bankInfo && bankInfo.bankName
      ? `
  <div class="bank-info">
    <h3>お振込先</h3>
    <table>
      <tr>
        <td>銀行名:</td>
        <td>${escapeHTML(bankInfo.bankName)}</td>
      </tr>
      <tr>
        <td>支店名:</td>
        <td>${escapeHTML(bankInfo.branchName)}</td>
      </tr>
      <tr>
        <td>口座種別:</td>
        <td>${escapeHTML(bankInfo.accountType)}</td>
      </tr>
      <tr>
        <td>口座番号:</td>
        <td>${escapeHTML(bankInfo.accountNumber)}</td>
      </tr>
      <tr>
        <td>口座名義:</td>
        <td>${escapeHTML(bankInfo.accountHolder)}</td>
      </tr>
    </table>
  </div>
  `
      : ''
  }

  ${
    invoice.notes
      ? `
  <div class="notes">
    <h3>備考</h3>
    <p>${escapeHTML(invoice.notes).replace(/\n/g, '<br>')}</p>
  </div>
  `
      : ''
  }

  <div class="footer">
    <p>※ お支払い期限までにお振込みをお願いいたします。</p>
    <p>※ 振込手数料は貴社にてご負担ください。</p>
    ${invoice.paymentTerms ? `<p>※ ${escapeHTML(invoice.paymentTerms)}</p>` : ''}
  </div>
</body>
</html>
`;
}

/**
 * HTMLエスケープ
 */
function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * PDF生成（Puppeteerを使用）
 */
export async function generatePDF(
  html: string,
  options?: Partial<PDFOptions>
): Promise<ApiResponse<Buffer>> {
  try {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    const pdfBuffer = await page.pdf({
      format: mergedOptions.paperSize,
      landscape: mergedOptions.orientation === 'landscape',
      margin: {
        top: `${mergedOptions.margin.top}mm`,
        right: `${mergedOptions.margin.right}mm`,
        bottom: `${mergedOptions.margin.bottom}mm`,
        left: `${mergedOptions.margin.left}mm`,
      },
      printBackground: true,
    });

    await browser.close();

    return {
      success: true,
      data: Buffer.from(pdfBuffer),
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'PDF_GENERATION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * 見積書PDFを生成
 */
export async function generateQuotePDF(
  quote: Quote,
  client: Client,
  company: CompanyInfo,
  options?: Partial<PDFOptions>
): Promise<ApiResponse<Buffer>> {
  const html = generateQuoteHTML(quote, client, company);
  return generatePDF(html, options);
}

/**
 * 請求書PDFを生成
 */
export async function generateInvoicePDF(
  invoice: Invoice,
  client: Client,
  company: CompanyInfo,
  options?: Partial<PDFOptions>
): Promise<ApiResponse<Buffer>> {
  const html = generateInvoiceHTML(invoice, client, company);
  return generatePDF(html, options);
}

/**
 * PDFをファイルに保存
 */
export async function savePDFToFile(
  pdfBuffer: Buffer,
  filePath: string
): Promise<ApiResponse<void>> {
  try {
    const { writeFile } = await import('fs/promises');
    await writeFile(filePath, pdfBuffer);

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'FILE_WRITE_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * HTMLをファイルに保存
 */
export async function saveHTMLToFile(
  html: string,
  filePath: string
): Promise<ApiResponse<void>> {
  try {
    const { writeFile } = await import('fs/promises');
    await writeFile(filePath, html, 'utf-8');

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'FILE_WRITE_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
