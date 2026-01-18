import React, { useState, useEffect } from 'react';

interface Quote {
  id: string;
  quoteNumber: string;
  clientName: string;
  projectName: string;
  status: string;
  amount: number;
  issueDate: string;
  validUntil: string;
}

export function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setQuotes([
        { id: '1', quoteNumber: 'Q-2026-001', clientName: '株式会社バズクリエイト', projectName: 'YouTube動画制作', status: '承認済み', amount: 220000, issueDate: '2026-01-10', validUntil: '2026-02-10' },
        { id: '2', quoteNumber: 'Q-2026-002', clientName: '合同会社ショートムービーズ', projectName: 'TikTok運用代行', status: '送付済み', amount: 150000, issueDate: '2026-01-12', validUntil: '2026-02-12' },
        { id: '3', quoteNumber: 'Q-2026-003', clientName: 'TikTok Master株式会社', projectName: 'ショート動画10本', status: '下書き', amount: 350000, issueDate: '2026-01-15', validUntil: '2026-02-15' },
        { id: '4', quoteNumber: 'Q-2026-004', clientName: '株式会社インフルエンサーラボ', projectName: 'コンテンツ企画', status: '承認待ち', amount: 280000, issueDate: '2026-01-16', validUntil: '2026-02-16' },
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
      case '承認済み': return 'status-completed';
      case '送付済み': return 'status-active';
      case '承認待ち': return 'status-pending';
      case '下書き': return 'status-default';
      default: return 'status-default';
    }
  };

  if (isLoading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="quotes-page">
      <div className="page-header">
        <h2 className="page-title">見積書管理</h2>
        <button className="btn-primary">+ 新規見積書</button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>見積番号</th>
              <th>クライアント</th>
              <th>案件名</th>
              <th>ステータス</th>
              <th>金額</th>
              <th>発行日</th>
              <th>有効期限</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <tr key={quote.id}>
                <td className="quote-number">{quote.quoteNumber}</td>
                <td>{quote.clientName}</td>
                <td>{quote.projectName}</td>
                <td>
                  <span className={`status-badge ${getStatusClass(quote.status)}`}>
                    {quote.status}
                  </span>
                </td>
                <td className="amount">{formatCurrency(quote.amount)}</td>
                <td>{quote.issueDate}</td>
                <td>{quote.validUntil}</td>
                <td>
                  <button className="btn-icon" title="PDF出力">📄</button>
                  <button className="btn-icon" title="編集">✏️</button>
                  <button className="btn-icon" title="請求書作成">💰</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
