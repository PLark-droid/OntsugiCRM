import React, { useState, useEffect } from 'react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  projectName: string;
  status: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  paidAmount: number;
}

export function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setInvoices([
        { id: '1', invoiceNumber: 'INV-2026-001', clientName: '株式会社バズクリエイト', projectName: 'YouTube動画制作', status: '入金済み', amount: 220000, issueDate: '2026-01-15', dueDate: '2026-02-28', paidAmount: 220000 },
        { id: '2', invoiceNumber: 'INV-2026-002', clientName: '合同会社ショートムービーズ', projectName: 'TikTok運用代行', status: '送付済み', amount: 150000, issueDate: '2026-01-18', dueDate: '2026-02-28', paidAmount: 0 },
        { id: '3', invoiceNumber: 'INV-2026-003', clientName: 'TikTok Master株式会社', projectName: 'ショート動画5本', status: '一部入金', amount: 175000, issueDate: '2026-01-10', dueDate: '2026-02-15', paidAmount: 100000 },
        { id: '4', invoiceNumber: 'INV-2026-004', clientName: '株式会社インフルエンサーラボ', projectName: 'コンテンツ企画', status: '下書き', amount: 280000, issueDate: '2026-01-20', dueDate: '2026-03-01', paidAmount: 0 },
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case '入金済み': return 'status-completed';
      case '送付済み': return 'status-active';
      case '一部入金': return 'status-warning';
      case '未回収': return 'status-danger';
      case '下書き': return 'status-default';
      default: return 'status-default';
    }
  };

  if (isLoading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="invoices-page">
      <div className="page-header">
        <h2 className="page-title">請求書管理</h2>
        <div className="header-actions">
          <button className="btn-secondary">freee CSV出力</button>
          <button className="btn-primary">+ 新規請求書</button>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <span className="summary-label">未入金合計</span>
          <span className="summary-value danger">{formatCurrency(225000)}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">今月の請求額</span>
          <span className="summary-value">{formatCurrency(825000)}</span>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>請求番号</th>
              <th>クライアント</th>
              <th>案件名</th>
              <th>ステータス</th>
              <th>請求額</th>
              <th>入金額</th>
              <th>発行日</th>
              <th>支払期日</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td className="invoice-number">{invoice.invoiceNumber}</td>
                <td>{invoice.clientName}</td>
                <td>{invoice.projectName}</td>
                <td>
                  <span className={`status-badge ${getStatusClass(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </td>
                <td className="amount">{formatCurrency(invoice.amount)}</td>
                <td className="amount">{formatCurrency(invoice.paidAmount)}</td>
                <td>{invoice.issueDate}</td>
                <td>{invoice.dueDate}</td>
                <td>
                  <button className="btn-icon" title="PDF出力">📄</button>
                  <button className="btn-icon" title="入金登録">💳</button>
                  <button className="btn-icon" title="編集">✏️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
