import React, { useState, useEffect } from 'react';

interface Project {
  id: string;
  name: string;
  clientName: string;
  status: string;
  amount: number;
  dueDate: string;
}

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // デモ用にモックデータを設定
    setTimeout(() => {
      setProjects([
        { id: '1', name: '【衝撃】知らないと損する節約術5選', clientName: '株式会社バズクリエイト', status: '納品', amount: 175000, dueDate: '2026-01-20' },
        { id: '2', name: '【検証】100均グッズで高級料理作ってみた', clientName: '合同会社ショートムービーズ', status: '着手中', amount: 110000, dueDate: '2026-01-25' },
        { id: '3', name: '【あるある】社会人1年目のリアル', clientName: 'TikTok Master株式会社', status: '提出', amount: 75000, dueDate: '2026-01-22' },
        { id: '4', name: '【神回】猫が初めて○○を見た結果...', clientName: '株式会社インフルエンサーラボ', status: '未着手', amount: 55000, dueDate: '2026-02-01' },
        { id: '5', name: '【裏技】iPhoneの隠し機能がヤバすぎた', clientName: 'クリエイターズギルド合同会社', status: '修正中', amount: 140000, dueDate: '2026-01-28' },
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
      case '納品': return 'status-completed';
      case '着手中': return 'status-active';
      case '提出': return 'status-pending';
      case '修正中': return 'status-warning';
      default: return 'status-default';
    }
  };

  const filteredProjects = filter === 'all'
    ? projects
    : projects.filter(p => p.status === filter);

  if (isLoading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="projects-page">
      <div className="page-header">
        <h2 className="page-title">案件管理</h2>
        <button className="btn-primary">+ 新規案件</button>
      </div>

      <div className="filters">
        <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          すべて
        </button>
        <button className={`filter-btn ${filter === '未着手' ? 'active' : ''}`} onClick={() => setFilter('未着手')}>
          未着手
        </button>
        <button className={`filter-btn ${filter === '着手中' ? 'active' : ''}`} onClick={() => setFilter('着手中')}>
          着手中
        </button>
        <button className={`filter-btn ${filter === '納品' ? 'active' : ''}`} onClick={() => setFilter('納品')}>
          納品
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>案件名</th>
              <th>クライアント</th>
              <th>ステータス</th>
              <th>金額</th>
              <th>期日</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map((project) => (
              <tr key={project.id}>
                <td className="project-name">{project.name}</td>
                <td>{project.clientName}</td>
                <td>
                  <span className={`status-badge ${getStatusClass(project.status)}`}>
                    {project.status}
                  </span>
                </td>
                <td className="amount">{formatCurrency(project.amount)}</td>
                <td>{project.dueDate}</td>
                <td>
                  <button className="btn-icon" title="編集">✏️</button>
                  <button className="btn-icon" title="詳細">👁️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
