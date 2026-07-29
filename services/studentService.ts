import {
  StudentFormData,
  StudentRecord,
  SupportLevel,
} from '@/types/auth';

const STUDENTS_KEY = 'didimdol_students_v1';
const DEFAULT_PASSWORD = '1111';

export const DEMO_STUDENTS: StudentRecord[] = [
  {
    id: 'demo-5-2-11',
    name: '김하늘',
    grade: 5,
    classNum: 2,
    studentNum: 11,
    password: DEFAULT_PASSWORD,
    defaultSupportLevel: 1,
    isDemo: true,
  },
  {
    id: 'demo-5-2-12',
    name: '이바다',
    grade: 5,
    classNum: 2,
    studentNum: 12,
    password: DEFAULT_PASSWORD,
    defaultSupportLevel: 2,
    isDemo: true,
  },
  {
    id: 'demo-5-2-13',
    name: '박푸름',
    grade: 5,
    classNum: 2,
    studentNum: 13,
    password: DEFAULT_PASSWORD,
    defaultSupportLevel: 3,
    isDemo: true,
  },
];

function normalizeSupportLevel(value: unknown): SupportLevel {
  const level = Number(value);
  return level === 1 || level === 2 || level === 3 ? level : 2;
}

function positiveInteger(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `student-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeStudent(value: unknown): StudentRecord | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<StudentRecord>;
  const grade = positiveInteger(candidate.grade);
  const classNum = positiveInteger(candidate.classNum);
  const studentNum = positiveInteger(candidate.studentNum);
  const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
  if (!grade || !classNum || !studentNum || !name) return null;

  return {
    id: typeof candidate.id === 'string' && candidate.id ? candidate.id : createId(),
    name,
    grade,
    classNum,
    studentNum,
    password:
      typeof candidate.password === 'string' && candidate.password.trim()
        ? candidate.password.trim()
        : DEFAULT_PASSWORD,
    defaultSupportLevel: normalizeSupportLevel(candidate.defaultSupportLevel),
    isDemo: candidate.isDemo === true,
  };
}

function writeStudents(students: StudentRecord[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
}

function validateInput(input: StudentFormData): Omit<StudentRecord, 'id'> {
  const name = input.name.trim();
  const grade = positiveInteger(input.grade);
  const classNum = positiveInteger(input.classNum);
  const studentNum = positiveInteger(input.studentNum);

  if (!name || !grade || !classNum || !studentNum) {
    throw new Error('이름, 학년, 반, 번호를 올바르게 입력해 주세요.');
  }

  return {
    name,
    grade,
    classNum,
    studentNum,
    password: input.password?.trim() || DEFAULT_PASSWORD,
    defaultSupportLevel: normalizeSupportLevel(input.defaultSupportLevel),
  };
}

function hasSameSchoolNumber(
  students: StudentRecord[],
  student: Pick<StudentRecord, 'grade' | 'classNum' | 'studentNum'>,
  exceptId?: string,
): boolean {
  return students.some(
    (item) =>
      item.id !== exceptId &&
      item.grade === student.grade &&
      item.classNum === student.classNum &&
      item.studentNum === student.studentNum,
  );
}

export const studentService = {
  getStudents(): StudentRecord[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STUDENTS_KEY);
    if (!stored) {
      const initial = DEMO_STUDENTS.map((student) => ({ ...student }));
      writeStudents(initial);
      return initial;
    }

    try {
      const parsed = JSON.parse(stored);
      const migrated = Array.isArray(parsed)
        ? parsed.map(normalizeStudent).filter((student): student is StudentRecord => Boolean(student))
        : [];
      writeStudents(migrated);
      return migrated;
    } catch {
      const initial = DEMO_STUDENTS.map((student) => ({ ...student }));
      writeStudents(initial);
      return initial;
    }
  },

  findStudent(grade: number, classNum: number, studentNum: number): StudentRecord | null {
    return (
      this.getStudents().find(
        (student) =>
          student.grade === grade &&
          student.classNum === classNum &&
          student.studentNum === studentNum,
      ) || null
    );
  },

  addStudent(input: StudentFormData): StudentRecord {
    const students = this.getStudents();
    const validated = validateInput(input);
    if (hasSameSchoolNumber(students, validated)) {
      throw new Error('같은 학년·반·번호의 학생이 이미 있습니다.');
    }
    const student: StudentRecord = { id: createId(), ...validated };
    writeStudents([...students, student]);
    return student;
  },

  updateStudent(studentId: string, changes: Partial<StudentFormData>): StudentRecord {
    const students = this.getStudents();
    const current = students.find((student) => student.id === studentId);
    if (!current) throw new Error('학생 정보를 찾을 수 없습니다.');

    const validated = validateInput({
      name: changes.name ?? current.name,
      grade: changes.grade ?? current.grade,
      classNum: changes.classNum ?? current.classNum,
      studentNum: changes.studentNum ?? current.studentNum,
      password: changes.password ?? current.password,
      defaultSupportLevel:
        changes.defaultSupportLevel ?? current.defaultSupportLevel,
    });
    if (hasSameSchoolNumber(students, validated, studentId)) {
      throw new Error('같은 학년·반·번호의 학생이 이미 있습니다.');
    }

    const updated: StudentRecord = {
      ...current,
      ...validated,
    };
    writeStudents(students.map((student) => (student.id === studentId ? updated : student)));
    return updated;
  },

  deleteStudent(studentId: string): void {
    writeStudents(this.getStudents().filter((student) => student.id !== studentId));
  },

  resetDemoStudents(): StudentRecord[] {
    const students = this.getStudents();
    const next = [...students];
    DEMO_STUDENTS.forEach((demo) => {
      const index = next.findIndex(
        (student) =>
          student.id === demo.id ||
          (student.grade === demo.grade &&
            student.classNum === demo.classNum &&
            student.studentNum === demo.studentNum),
      );
      if (index < 0) next.push({ ...demo });
    });
    writeStudents(next);
    return next;
  },

  getLatestStudentProfile(
    studentIdOrLocation:
      | string
      | { grade: number; classNum: number; studentNum: number },
  ): StudentRecord | null {
    const students = this.getStudents();
    if (typeof studentIdOrLocation === 'string') {
      return students.find((student) => student.id === studentIdOrLocation) || null;
    }
    return (
      students.find(
        (student) =>
          student.grade === studentIdOrLocation.grade &&
          student.classNum === studentIdOrLocation.classNum &&
          student.studentNum === studentIdOrLocation.studentNum,
      ) || null
    );
  },
};
