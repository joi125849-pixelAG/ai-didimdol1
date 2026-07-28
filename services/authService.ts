import { User, StudentCredentials, AdminCredentials } from '@/types/auth';

const STORAGE_KEY = 'didimdol_auth_user';

// Sample data as specified in requirements
const SAMPLE_STUDENT = {
  grade: 5,
  classNum: 2,
  studentNum: 12,
  password: '1111',
  name: '김하늘',
};

const ADMIN_CREDENTIALS = {
  username: 'Admin',
  password: '1111',
};

export const authService = {
  loginAdmin(credentials: AdminCredentials): User {
    if (
      credentials.username.trim() === ADMIN_CREDENTIALS.username &&
      credentials.password.trim() === ADMIN_CREDENTIALS.password
    ) {
      const user: User = {
        role: 'admin',
        admin: { username: ADMIN_CREDENTIALS.username },
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      }
      return user;
    }
    throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
  },

  loginStudent(credentials: StudentCredentials): User {
    const gradeNum = parseInt(credentials.grade, 10);
    const classNum = parseInt(credentials.classNum, 10);
    const studentNum = parseInt(credentials.studentNum, 10);

    if (
      gradeNum === SAMPLE_STUDENT.grade &&
      classNum === SAMPLE_STUDENT.classNum &&
      studentNum === SAMPLE_STUDENT.studentNum &&
      credentials.password.trim() === SAMPLE_STUDENT.password
    ) {
      const user: User = {
        role: 'student',
        student: {
          grade: SAMPLE_STUDENT.grade,
          classNum: SAMPLE_STUDENT.classNum,
          studentNum: SAMPLE_STUDENT.studentNum,
          name: SAMPLE_STUDENT.name,
        },
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      }
      return user;
    }
    throw new Error('학생 정보 또는 비밀번호가 올바르지 않습니다.');
  },

  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  },
};
