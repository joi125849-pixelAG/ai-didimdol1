'use client';

import React, { useMemo, useState } from 'react';
import {
  Plus,
  RotateCcw,
  Search,
  Users,
  UserRoundPen,
  Trash2,
  KeyRound,
  X,
} from 'lucide-react';
import { studentService } from '@/services/studentService';
import { StudentFormData, StudentRecord, SupportLevel } from '@/types/auth';

const LEVEL_LABELS: Record<SupportLevel, string> = {
  1: '1단계 — 그림·상황 중심',
  2: '2단계 — 쉬운 말·문장 풀이 중심',
  3: '3단계 — 질문·작은 단서 중심',
};

type FormState = {
  name: string;
  grade: string;
  classNum: string;
  studentNum: string;
  password: string;
  defaultSupportLevel: SupportLevel;
};

const EMPTY_FORM: FormState = {
  name: '',
  grade: '5',
  classNum: '1',
  studentNum: '1',
  password: '1111',
  defaultSupportLevel: 2,
};

export function StudentManagement() {
  const [students, setStudents] = useState<StudentRecord[]>(() =>
    studentService.getStudents(),
  );
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | SupportLevel>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const counts = useMemo(
    () => ({
      all: students.length,
      1: students.filter((student) => student.defaultSupportLevel === 1).length,
      2: students.filter((student) => student.defaultSupportLevel === 2).length,
      3: students.filter((student) => student.defaultSupportLevel === 3).length,
    }),
    [students],
  );

  const filteredStudents = useMemo(() => {
    const query = search.normalize('NFKC').trim().toLocaleLowerCase();
    return students.filter((student) => {
      const searchable = `${student.name} ${student.grade}학년 ${student.classNum}반 ${student.studentNum}번`;
      return (
        (levelFilter === 'all' || student.defaultSupportLevel === levelFilter) &&
        (!query || searchable.toLocaleLowerCase().includes(query))
      );
    });
  }, [students, search, levelFilter]);

  const refresh = () => setStudents(studentService.getStudents());

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setMessage('');
    setShowForm(true);
  };

  const openEditForm = (student: StudentRecord) => {
    setEditingId(student.id);
    setForm({
      name: student.name,
      grade: String(student.grade),
      classNum: String(student.classNum),
      studentNum: String(student.studentNum),
      password: student.password,
      defaultSupportLevel: student.defaultSupportLevel,
    });
    setError('');
    setMessage('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setError('');
  };

  const toStudentInput = (): StudentFormData => ({
    name: form.name,
    grade: Number(form.grade),
    classNum: Number(form.classNum),
    studentNum: Number(form.studentNum),
    password: form.password,
    defaultSupportLevel: form.defaultSupportLevel,
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      if (editingId) {
        studentService.updateStudent(editingId, toStudentInput());
        setMessage('학생 정보를 수정했습니다.');
      } else {
        studentService.addStudent(toStudentInput());
        setMessage('학생을 추가했습니다.');
      }
      refresh();
      closeForm();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '학생 정보를 저장하지 못했습니다.');
    }
  };

  const handleLevelChange = (student: StudentRecord, level: SupportLevel) => {
    try {
      studentService.updateStudent(student.id, { defaultSupportLevel: level });
      refresh();
      setMessage(`${student.name} 학생의 도움 단계를 ${level}단계로 변경했습니다.`);
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '단계를 변경하지 못했습니다.');
    }
  };

  const handleResetPassword = (student: StudentRecord) => {
    if (!window.confirm(`${student.name} 학생의 비밀번호를 1111로 초기화할까요?`)) return;
    studentService.updateStudent(student.id, { password: '1111' });
    refresh();
    setMessage(`${student.name} 학생의 비밀번호를 초기화했습니다.`);
  };

  const handleDelete = (student: StudentRecord) => {
    if (!window.confirm(`${student.name} 학생을 삭제할까요?`)) return;
    studentService.deleteStudent(student.id);
    refresh();
    setMessage(`${student.name} 학생을 삭제했습니다.`);
  };

  const handleRestoreDemos = () => {
    setStudents(studentService.resetDemoStudents());
    setMessage('누락된 체험용 계정을 복원했습니다.');
    setError('');
  };

  return (
    <section className="student-management" aria-labelledby="student-management-title">
      <div className="management-heading">
        <div>
          <div className="admin-badge-label">
            <Users size={16} />
            교사용 관리
          </div>
          <h1 id="student-management-title">학생 관리</h1>
          <p>학생별 도움 단계를 지정하면 다음 로그인과 다음 분석부터 반영됩니다.</p>
        </div>
        <div className="management-actions">
          <button className="secondary-action" type="button" onClick={handleRestoreDemos}>
            <RotateCcw size={17} />
            데모 계정 복원
          </button>
          <button className="primary-action" type="button" onClick={openAddForm}>
            <Plus size={18} />
            학생 추가
          </button>
        </div>
      </div>

      <div className="student-counts" aria-label="학생 수 요약">
        <div><strong>{counts.all}</strong><span>전체 학생</span></div>
        <div><strong>{counts[1]}</strong><span>1단계</span></div>
        <div><strong>{counts[2]}</strong><span>2단계</span></div>
        <div><strong>{counts[3]}</strong><span>3단계</span></div>
      </div>

      <div className="management-toolbar">
        <label className="student-search">
          <Search size={18} />
          <span className="sr-only">학생 검색</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="이름 또는 학년·반·번호 검색"
          />
        </label>
        <label className="level-filter">
          <span>도움 단계</span>
          <select
            value={levelFilter}
            onChange={(event) =>
              setLevelFilter(event.target.value === 'all' ? 'all' : Number(event.target.value) as SupportLevel)
            }
          >
            <option value="all">전체</option>
            <option value="1">1단계</option>
            <option value="2">2단계</option>
            <option value="3">3단계</option>
          </select>
        </label>
      </div>

      {message && <p className="management-message" role="status">{message}</p>}
      {error && !showForm && <p className="management-error" role="alert">{error}</p>}

      {showForm && (
        <form className="student-form-panel" onSubmit={handleSubmit}>
          <div className="student-form-title">
            <h2>{editingId ? '학생 정보 수정' : '새 학생 추가'}</h2>
            <button type="button" onClick={closeForm} aria-label="입력창 닫기"><X size={20} /></button>
          </div>
          <div className="student-form-grid">
            <label>이름<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>학년<input required min="1" type="number" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} /></label>
            <label>반<input required min="1" type="number" value={form.classNum} onChange={(e) => setForm({ ...form, classNum: e.target.value })} /></label>
            <label>번호<input required min="1" type="number" value={form.studentNum} onChange={(e) => setForm({ ...form, studentNum: e.target.value })} /></label>
            <label>비밀번호<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="비우면 1111" /></label>
            <label>도움 단계
              <select value={form.defaultSupportLevel} onChange={(e) => setForm({ ...form, defaultSupportLevel: Number(e.target.value) as SupportLevel })}>
                {([1, 2, 3] as SupportLevel[]).map((level) => <option key={level} value={level}>{LEVEL_LABELS[level]}</option>)}
              </select>
            </label>
          </div>
          {error && <p className="management-error" role="alert">{error}</p>}
          <div className="student-form-actions">
            <button className="secondary-action" type="button" onClick={closeForm}>취소</button>
            <button className="primary-action" type="submit">{editingId ? '저장' : '추가'}</button>
          </div>
        </form>
      )}

      <div className="student-table-wrap">
        <table className="student-table">
          <thead>
            <tr>
              <th>이름</th><th>학년</th><th>반</th><th>번호</th><th>지정 도움 단계</th><th>관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr key={student.id}>
                <td data-label="이름"><strong>{student.name}</strong>{student.isDemo && <span className="demo-tag">체험용</span>}</td>
                <td data-label="학년">{student.grade}</td>
                <td data-label="반">{student.classNum}</td>
                <td data-label="번호">{student.studentNum}</td>
                <td data-label="지정 도움 단계">
                  <select
                    aria-label={`${student.name} 도움 단계`}
                    value={student.defaultSupportLevel}
                    onChange={(event) => handleLevelChange(student, Number(event.target.value) as SupportLevel)}
                  >
                    {([1, 2, 3] as SupportLevel[]).map((level) => <option key={level} value={level}>{LEVEL_LABELS[level]}</option>)}
                  </select>
                </td>
                <td data-label="관리">
                  <div className="row-actions">
                    <button type="button" onClick={() => handleResetPassword(student)} title="비밀번호 초기화"><KeyRound size={16} /><span>초기화</span></button>
                    <button type="button" onClick={() => openEditForm(student)}><UserRoundPen size={16} /><span>수정</span></button>
                    <button className="danger" type="button" onClick={() => handleDelete(student)}><Trash2 size={16} /><span>삭제</span></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredStudents.length === 0 && <p className="empty-students">조건에 맞는 학생이 없습니다.</p>}
      </div>
    </section>
  );
}
