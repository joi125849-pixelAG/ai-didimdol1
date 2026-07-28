'use client';

import React from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Camera, ImagePlus, Edit3, FolderCheck, Lightbulb, Compass, BookOpenCheck } from 'lucide-react';

import { useRouter } from 'next/navigation';

export function StudentHome() {
  const { user } = useAuth();
  const router = useRouter();
  const studentName = user?.student?.name || '김하늘';

  const actionButtons = [
    {
      id: 'camera',
      title: '사진 찍기',
      subtitle: '어려운 문제나 문장을 카메라로 바로 촬영해요',
      icon: <Camera size={32} className="btn-icon camera" />,
      color: 'blue',
    },
    {
      id: 'upload',
      title: '사진 올리기',
      subtitle: '갤러리에 저장된 교재나 학습지 사진을 선택해요',
      icon: <ImagePlus size={32} className="btn-icon upload" />,
      color: 'emerald',
    },
    {
      id: 'manual',
      title: '직접 입력하기',
      subtitle: '이해하기 힘든 글이나 문제를 직접 타이핑해요',
      icon: <Edit3 size={32} className="btn-icon manual" />,
      color: 'amber',
    },
    {
      id: 'teacher-materials',
      title: '선생님이 준 자료',
      subtitle: '선생님이 지정해 준 원문이나 활동 자료를 확인해요',
      icon: <FolderCheck size={32} className="btn-icon teacher" />,
      color: 'purple',
    },
  ];

  const handleCardClick = (id: string, title: string) => {
    if (id === 'manual') {
      router.push('/student/input');
    } else {
      alert(`'${title}' 기능은 준비 중입니다.`);
    }
  };

  return (
    <div className="student-container">
      {/* Top Welcome Hero */}
      <div className="welcome-hero">
        <div className="hero-badge">
          <Compass size={18} />
          <span>초등 국어 · 수학 · 사회 · 과학 디딤돌</span>
        </div>
        <h1 className="welcome-title">안녕하세요, {studentName} 학생!</h1>
        <p className="welcome-subtitle">어떤 내용이 어려운가요?</p>
      </div>

      {/* Main Action Grid */}
      <div className="action-grid">
        {actionButtons.map((btn) => (
          <button
            key={btn.id}
            className={`action-card ${btn.color}`}
            onClick={() => handleCardClick(btn.id, btn.title)}
          >
            <div className="action-icon-box">{btn.icon}</div>
            <div className="action-text-box">
              <h2 className="action-title">{btn.title}</h2>
              <p className="action-subtitle">{btn.subtitle}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Educational Principle Banner */}
      <div className="principle-banner">
        <div className="principle-header">
          <Lightbulb size={22} className="principle-icon" />
          <h3 className="principle-title">디딤돌의 학습 원칙</h3>
        </div>
        <ul className="principle-list">
          <li>
            <BookOpenCheck size={16} />
            <span>정답이나 완성된 글을 대신 써주지 않아요.</span>
          </li>
          <li>
            <BookOpenCheck size={16} />
            <span>스스로 이해할 수 있도록 필요한 만큼만 힌트와 비계를 제공해요.</span>
          </li>
          <li>
            <BookOpenCheck size={16} />
            <span>원문을 이해하고 나면 즉시 원래 교과 학습으로 돌아갑니다.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
