'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { ArrowLeft, Sparkles, AlertCircle, BookOpen, RefreshCw, Edit, Home } from 'lucide-react';

const SUBJECT_OPTIONS = [
  { id: 'auto', label: '자동' },
  { id: 'korean', label: '국어' },
  { id: 'math', label: '수학' },
  { id: 'social', label: '사회' },
  { id: 'science', label: '과학' },
];

const DEFAULT_SUPPORT_LEVEL_KEY = 'ai-step-default-support-level';

function getStoredDefaultSupportLevel(): number {
  if (typeof window === 'undefined') return 2;
  const stored =
    localStorage.getItem(DEFAULT_SUPPORT_LEVEL_KEY) ||
    localStorage.getItem('defaultSupportLevel');
  const parsed = Number(stored);
  return [1, 2, 3].includes(parsed) ? parsed : 2;
}

export default function StudentInputPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [inputText, setInputText] = useState('');
  const [subject, setSubject] = useState('auto');
  const [validationError, setValidationError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'student') {
        router.push('/admin');
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedInput = localStorage.getItem('ai-step-input');
      const savedSubject = localStorage.getItem('ai-step-subject');
      if (savedInput) setInputText(savedInput);
      if (savedSubject) setSubject(savedSubject);
    }
  }, []);

  const handleStartAnalysis = async () => {
    if (!inputText.trim()) {
      setValidationError('도움받을 내용을 입력해 주세요.');
      return;
    }

    setValidationError('');
    setApiError(false);
    setIsAnalyzing(true);
    const defaultSupportLevel = getStoredDefaultSupportLevel();

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText.trim(),
          subject: subject,
          grade: 5,
          defaultLevel: defaultSupportLevel,
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();

      if (typeof window !== 'undefined') {
        localStorage.setItem('ai-step-input', inputText.trim());
        localStorage.setItem('ai-step-subject', subject);
        localStorage.setItem('ai-step-analysis-result', JSON.stringify(data));
        localStorage.setItem(DEFAULT_SUPPORT_LEVEL_KEY, String(defaultSupportLevel));
      }

      router.push('/student/result');
    } catch (err) {
      console.error('Analysis request error:', err);
      setApiError(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGoHome = () => {
    router.push('/student');
  };

  if (loading || !user || user.role !== 'student') {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>화면을 불러오는 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="main-content">
        <div className="input-page-container">
          {/* Header */}
          <div className="input-page-header">
            <button
              onClick={handleGoHome}
              className="back-btn"
              type="button"
              disabled={isAnalyzing}
            >
              <ArrowLeft size={20} />
              <span>홈으로 돌아가기</span>
            </button>
            <h1 className="input-page-title">
              <BookOpen size={28} className="title-icon" />
              직접 입력하기
            </h1>
            <p className="input-page-subtitle">
              교과서에 나오는 어려운 문장이나 잘 이해되지 않는 문제를 입력해 주세요.
            </p>
          </div>

          {/* API Failure Screen */}
          {apiError ? (
            <div className="api-error-card">
              <div className="api-error-header">
                <AlertCircle size={28} className="error-icon" />
                <h2>내용을 분석하지 못했어요. 잠시 후 다시 시도해 주세요.</h2>
              </div>
              <div className="api-error-actions">
                <button
                  onClick={handleStartAnalysis}
                  className="retry-btn"
                  type="button"
                >
                  <RefreshCw size={18} />
                  <span>다시 시도</span>
                </button>
                <button
                  onClick={() => setApiError(false)}
                  className="secondary-btn"
                  type="button"
                >
                  <Edit size={18} />
                  <span>원문 수정</span>
                </button>
                <button
                  onClick={handleGoHome}
                  className="secondary-btn"
                  type="button"
                >
                  <Home size={18} />
                  <span>홈으로 돌아가기</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Subject Selection */}
              <div className="subject-section">
                <label className="section-label">과목 선택</label>
                <div className="subject-pills">
                  {SUBJECT_OPTIONS.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      disabled={isAnalyzing}
                      className={`subject-pill ${subject === sub.id ? 'active' : ''}`}
                      onClick={() => setSubject(sub.id)}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea Input */}
              <div className="textarea-section">
                <label className="section-label">원문 내용</label>
                <textarea
                  className={`input-textarea ${validationError ? 'error-border' : ''}`}
                  rows={8}
                  disabled={isAnalyzing}
                  placeholder="교과서 문장이나 문제 내용을 그대로 입력해 주세요."
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                />
              </div>

              {/* Validation Error Banner */}
              {validationError && (
                <div className="error-banner">
                  <AlertCircle size={20} />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Analyzing Indicator */}
              {isAnalyzing && (
                <div className="analyzing-banner">
                  <div className="small-spinner"></div>
                  <span>입력한 내용을 살펴보고 있어요.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="input-action-bar">
                <button
                  onClick={handleStartAnalysis}
                  className="start-analysis-btn"
                  type="button"
                  disabled={isAnalyzing}
                >
                  <Sparkles size={22} />
                  <span>{isAnalyzing ? '분석 진행 중...' : '내용 분석을 시작할게요.'}</span>
                </button>
                <button
                  onClick={handleGoHome}
                  className="secondary-btn"
                  type="button"
                  disabled={isAnalyzing}
                >
                  홈으로 돌아가기
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
