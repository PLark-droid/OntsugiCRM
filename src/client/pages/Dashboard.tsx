import React, { useState, useEffect } from 'react';

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  pendingQuotes: number;
  unpaidInvoices: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    pendingQuotes: 0,
    unpaidInvoices: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // デモ用にモックデータを設定
    setTimeout(() => {
      setStats({
        totalProjects: 45,
        activeProjects: 12,
        pendingQuotes: 5,
        unpaidInvoices: 3,
        totalRevenue: 12500000,
        monthlyRevenue: 2850000,
      });
      setIsLoading(false);
    }, 500);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  if (isLoading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="dashboard">
      <h2 className="page-title">ダッシュボード</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📁</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalProjects}</div>
            <div className="stat-label">全案件数</div>
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-icon">🚀</div>
          <div className="stat-content">
            <div className="stat-value">{stats.activeProjects}</div>
            <div className="stat-label">進行中の案件</div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <div className="stat-value">{stats.pendingQuotes}</div>
            <div className="stat-label">承認待ち見積</div>
          </div>
        </div>

        <div className="stat-card danger">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">{stats.unpaidInvoices}</div>
            <div className="stat-label">未入金請求書</div>
          </div>
        </div>
      </div>

      <div className="revenue-section">
        <h3>売上サマリー</h3>
        <div className="revenue-cards">
          <div className="revenue-card">
            <div className="revenue-label">今月の売上</div>
            <div className="revenue-value">{formatCurrency(stats.monthlyRevenue)}</div>
          </div>
          <div className="revenue-card">
            <div className="revenue-label">累計売上</div>
            <div className="revenue-value">{formatCurrency(stats.totalRevenue)}</div>
          </div>
        </div>
      </div>

      <div className="recent-section">
        <h3>最近の活動</h3>
        <div className="activity-list">
          <div className="activity-item">
            <span className="activity-icon">✅</span>
            <span className="activity-text">案件「YouTubeショート編集」が納品完了しました</span>
            <span className="activity-time">2時間前</span>
          </div>
          <div className="activity-item">
            <span className="activity-icon">📝</span>
            <span className="activity-text">見積書 Q-2026-015 が承認されました</span>
            <span className="activity-time">5時間前</span>
          </div>
          <div className="activity-item">
            <span className="activity-icon">💰</span>
            <span className="activity-text">請求書 INV-2026-008 の入金を確認しました</span>
            <span className="activity-time">1日前</span>
          </div>
        </div>
      </div>
    </div>
  );
}
