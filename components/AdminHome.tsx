'use client';

import React from 'react';
import { Users, Sliders, History, Bot, Sparkles } from 'lucide-react';

interface CardItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  tag: string;
}

export function AdminHome() {
  const cards: CardItem[] = [
    {
      id: 'student-management',
      title: '학생 관리',
      description: '학생 계정 조회, 반별 목록 관리 및 학습자 맞춤 비계 레벨을 설정합니다.',
      icon: <Users size={28} className="card-icon text-blue" />,
      tag: '준비 중',
    },
    {
      id: 'level-settings',
      title: '단계 설정',
      description: '1~4단계 비계 지원 가이드라인 및 질문·힌트 제공 범위를 세부 조율합니다.',
      icon: <Sliders size={28} className="card-icon text-indigo" />,
      tag: '준비 중',
    },
    {
      id: 'learning-logs',
      title: '학습 기록',
      description: '국어·수학·사회·과학 원문 이해 학습 이력과 학생별 질문 응답 기록을 조회합니다.',
      icon: <History size={28} className="card-icon text-emerald" />,
      tag: '준비 중',
    },
    {
      id: 'ai-status',
      title: 'AI 연결 상태',
      description: 'Gemini AI 연동 상태, 프롬프트 템플릿 및 API 응답 품질을 관리합니다.',
      icon: <Bot size={28} className="card-icon text-amber" />,
      tag: '다음 단계 구현 예정',
    },
  ];

  return (
    <div className="admin-container">
      <div className="admin-header-card">
        <div className="admin-header-content">
          <div className="admin-badge-label">
            <Sparkles size={16} />
            <span>선생님·관리자 전용 대시보드</span>
          </div>
          <h1 className="admin-title">초등 교과 비계 학습 관리 홈</h1>
          <p className="admin-subtitle">
            학생들의 스스로 생각하는 힘을 기르는 비계(Scaffolding) 지원 시스템을 모니터링하고 설정할 수 있습니다.
          </p>
        </div>
      </div>

      <div className="admin-grid">
        {cards.map((card) => (
          <div key={card.id} className="admin-card">
            <div className="card-header">
              <div className="icon-wrapper">{card.icon}</div>
              <span className="card-status-tag">{card.tag}</span>
            </div>
            <h3 className="card-title">{card.title}</h3>
            <p className="card-description">{card.description}</p>
            <div className="card-footer">
              <span className="card-link">임시 카드</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
