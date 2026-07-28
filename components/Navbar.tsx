'use client';

import React from 'react';
import { useAuth } from '@/components/AuthProvider';
import { LogOut, BookOpen, ShieldCheck, User as UserIcon } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="site-header">
      <div className="header-container">
        <div className="brand">
          <div className="brand-icon">
            <BookOpen size={24} color="#ffffff" />
          </div>
          <div className="brand-text">
            <span className="brand-title">AI 교과 디딤돌</span>
            <span className="brand-subtitle">초등 맞춤형 비계 학습 지원</span>
          </div>
        </div>

        <div className="user-profile">
          <div className="user-badge">
            {user.role === 'admin' ? (
              <>
                <ShieldCheck size={16} className="badge-icon admin" />
                <span className="badge-text admin">관리자 ({user.admin?.username})</span>
              </>
            ) : (
              <>
                <UserIcon size={16} className="badge-icon student" />
                <span className="badge-text student">
                  {user.student?.grade}학년 {user.student?.classNum}반 {user.student?.studentNum}번 {user.student?.name}
                </span>
              </>
            )}
          </div>

          <button onClick={logout} className="logout-btn" title="로그아웃">
            <LogOut size={16} />
            <span>로그아웃</span>
          </button>
        </div>
      </div>
    </header>
  );
}
