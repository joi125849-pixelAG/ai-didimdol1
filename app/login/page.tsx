'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { BookOpen, UserCheck, Shield, KeyRound, AlertCircle, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { user, loginStudent, loginAdmin } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<'student' | 'admin'>('student');

  // Student inputs
  const [grade, setGrade] = useState('5');
  const [classNum, setClassNum] = useState('2');
  const [studentNum, setStudentNum] = useState('11');
  const [studentPassword, setStudentPassword] = useState('1111');

  // Admin inputs
  const [adminUsername, setAdminUsername] = useState('Admin');
  const [adminPassword, setAdminPassword] = useState('1111');

  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/student');
      }
    }
  }, [user, router]);

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      loginStudent({
        grade,
        classNum,
        studentNum,
        password: studentPassword,
      });
    } catch (err: any) {
      setErrorMsg(err.message || '로그인에 실패했습니다.');
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      loginAdmin({
        username: adminUsername,
        password: adminPassword,
      });
    } catch (err: any) {
      setErrorMsg(err.message || '로그인에 실패했습니다.');
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card-box">
        {/* Brand Header */}
        <div className="login-brand">
          <div className="login-logo-circle">
            <BookOpen size={36} color="#ffffff" />
          </div>
          <h1 className="login-brand-title">AI 교과 디딤돌</h1>
          <p className="login-brand-desc">
            스스로 생각하고 문제를 해결하도록 돕는 초등 비계 학습 시스템
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="login-tabs">
          <button
            className={`tab-btn ${tab === 'student' ? 'active' : ''}`}
            onClick={() => {
              setTab('student');
              setErrorMsg('');
            }}
          >
            <UserCheck size={18} />
            <span>학생 로그인</span>
          </button>
          <button
            className={`tab-btn ${tab === 'admin' ? 'active' : ''}`}
            onClick={() => {
              setTab('admin');
              setErrorMsg('');
            }}
          >
            <Shield size={18} />
            <span>관리자 로그인</span>
          </button>
        </div>

        {errorMsg && (
          <div className="error-banner">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Student Login Form */}
        {tab === 'student' && (
          <form onSubmit={handleStudentSubmit} className="login-form">
            <div className="info-notice">
              <KeyRound size={16} />
              <span>초기 비밀번호는 1111입니다.</span>
            </div>

            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label">학년</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  required
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="form-input"
                  placeholder="예: 5"
                />
              </div>
              <div className="form-group">
                <label className="form-label">반</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={classNum}
                  onChange={(e) => setClassNum(e.target.value)}
                  className="form-input"
                  placeholder="예: 2"
                />
              </div>
              <div className="form-group">
                <label className="form-label">번호</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={studentNum}
                  onChange={(e) => setStudentNum(e.target.value)}
                  className="form-input"
                  placeholder="예: 12"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">비밀번호</label>
              <input
                type="password"
                required
                value={studentPassword}
                onChange={(e) => setStudentPassword(e.target.value)}
                className="form-input"
                placeholder="비밀번호 입력"
              />
            </div>

            <button type="submit" className="submit-btn student-submit">
              <Sparkles size={18} />
              <span>학생 학습 시작하기</span>
            </button>

            <aside className="demo-accounts" aria-label="체험용 학생 계정">
              <strong>체험용 계정</strong>
              <span>1단계: 5학년 2반 11번 / 1111</span>
              <span>2단계: 5학년 2반 12번 / 1111</span>
              <span>3단계: 5학년 2반 13번 / 1111</span>
            </aside>
          </form>
        )}

        {/* Admin Login Form */}
        {tab === 'admin' && (
          <form onSubmit={handleAdminSubmit} className="login-form">
            <div className="info-notice">
              <KeyRound size={16} />
              <span>초기 비밀번호는 1111입니다.</span>
            </div>

            <div className="form-group">
              <label className="form-label">관리자 아이디</label>
              <input
                type="text"
                required
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                className="form-input"
                placeholder="Admin"
              />
            </div>

            <div className="form-group">
              <label className="form-label">비밀번호</label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="form-input"
                placeholder="비밀번호 입력"
              />
            </div>

            <button type="submit" className="submit-btn admin-submit">
              <Shield size={18} />
              <span>관리자 로그인</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
