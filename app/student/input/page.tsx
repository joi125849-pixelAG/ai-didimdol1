'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { studentService } from '@/services/studentService';
import { ArrowLeft, Sparkles, AlertCircle, BookOpen, RefreshCw, Edit, Home } from 'lucide-react';

const SUBJECT_OPTIONS = [
  { id: 'auto', label: '자동' },
  { id: 'korean', label: '국어' },
  { id: 'math', label: '수학' },
  { id: 'social', label: '사회' },
  { id: 'science', label: '과학' },
];

const DEFAULT_SUPPORT_LEVEL_KEY = 'ai-step-default-support-level';

export default function StudentInputPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [inputText, setInputText] = useState('');
  const [subject, setSubject] = useState('auto');
  const [validationError, setValidationError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'camera' | 'upload'>('text');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

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
      const requestedMode = new URLSearchParams(window.location.search).get('mode');
      if (requestedMode === 'camera' || requestedMode === 'upload') {
        setInputMode(requestedMode);
      }
      const savedInput = localStorage.getItem('ai-step-input');
      const savedSubject = localStorage.getItem('ai-step-subject');
      if (savedInput) setInputText(savedInput);
      if (savedSubject) setSubject(savedSubject);
    }
  }, []);

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview('');
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  };

  const selectImage = (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setValidationError('지원하지 않는 사진 형식이에요.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setValidationError('사진 크기는 8MB 이하로 올려주세요.');
      return;
    }
    clearImage();
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setValidationError('');
  };

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleStartAnalysis = async () => {
    const isImageMode = inputMode !== 'text';
    if ((!isImageMode && !inputText.trim()) || (isImageMode && !imageFile)) {
      setValidationError(isImageMode ? '분석할 사진을 선택해 주세요.' : '도움받을 내용을 입력해 주세요.');
      return;
    }

    setValidationError('');
    setApiError(false);
    setIsAnalyzing(true);
    const latestStudent = user?.student
      ? studentService.getLatestStudentProfile(user.student.id) ||
        studentService.getLatestStudentProfile({
          grade: user.student.grade,
          classNum: user.student.classNum,
          studentNum: user.student.studentNum,
        })
      : null;
    const defaultSupportLevel = latestStudent?.defaultSupportLevel ?? 2;

    try {
      const imageData = imageFile ? await fileToBase64(imageFile) : '';
      const response = await fetch(isImageMode ? '/api/analyze-image' : '/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isImageMode ? { imageData, mimeType: imageFile?.type } : { text: inputText.trim() }),
          subject: subject,
          grade: latestStudent?.grade ?? user?.student?.grade ?? 5,
          defaultLevel: defaultSupportLevel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'API request failed');
      }

      const data = await response.json();

      if (typeof window !== 'undefined') {
        localStorage.setItem('ai-step-input', isImageMode ? data.originalText || '' : inputText.trim());
        localStorage.setItem('ai-step-subject', subject);
        localStorage.setItem('ai-step-analysis-result', JSON.stringify(data));
        localStorage.setItem(DEFAULT_SUPPORT_LEVEL_KEY, String(defaultSupportLevel));
      }

      router.push('/student/result');
    } catch (err) {
      console.error('Analysis request error:', err);
      if (isImageMode) {
        setValidationError(
          err instanceof Error && err.message.includes('글자를 읽기')
            ? err.message
            : '사진 분석 중 문제가 생겼어요. 직접 입력을 이용해 주세요.',
        );
      }
      setApiError(!isImageMode);
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

              <div className="input-mode-tabs" aria-label="입력 방식">
                <button type="button" className={inputMode === 'text' ? 'active' : ''} onClick={() => setInputMode('text')}>직접 입력</button>
                <button type="button" className={inputMode === 'camera' ? 'active' : ''} onClick={() => { setInputMode('camera'); cameraInputRef.current?.click(); }}>사진 촬영</button>
                <button type="button" className={inputMode === 'upload' ? 'active' : ''} onClick={() => { setInputMode('upload'); uploadInputRef.current?.click(); }}>이미지 업로드</button>
              </div>
              <input ref={cameraInputRef} hidden type="file" accept="image/*" capture="environment" onChange={(event) => selectImage(event.target.files?.[0])} />
              <input ref={uploadInputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectImage(event.target.files?.[0])} />
              {inputMode !== 'text' && (
                <div className="image-input-panel">
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="선택한 학습 사진 미리보기" />
                      <div className="image-input-actions">
                        <button type="button" disabled={isAnalyzing} onClick={() => (inputMode === 'camera' ? cameraInputRef : uploadInputRef).current?.click()}>다른 사진 선택</button>
                        <button type="button" disabled={isAnalyzing} onClick={clearImage}>사진 삭제</button>
                      </div>
                    </>
                  ) : <p>촬영하거나 업로드할 사진을 선택해 주세요.</p>}
                </div>
              )}

              {/* Textarea Input */}
              <div className="textarea-section" hidden={inputMode !== 'text'}>
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
                  <span>{inputMode === 'text' ? '입력한 내용을 살펴보고 있어요.' : '사진 속 내용을 살펴보고 있어요.'}</span>
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
                  <span>{isAnalyzing ? '분석 진행 중...' : inputMode === 'text' ? '내용 분석을 시작할게요.' : '사진 분석 시작'}</span>
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
