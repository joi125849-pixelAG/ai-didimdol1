import { User, StudentCredentials, AdminCredentials } from '@/types/auth';
import { studentService } from '@/services/studentService';

const STORAGE_KEY = 'didimdol_auth_user';
const SUPPORT_LEVEL_KEY = 'ai-step-default-support-level';

const ADMIN_CREDENTIALS = {
  username: 'Admin',
  password: '1111',
};

function saveUser(user: User): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  if (user.student) {
    localStorage.setItem(SUPPORT_LEVEL_KEY, String(user.student.defaultSupportLevel));
  }
}

function createStudentUser(
  student: ReturnType<typeof studentService.findStudent>,
): User | null {
  if (!student) return null;
  return {
    role: 'student',
    student: {
      id: student.id,
      grade: student.grade,
      classNum: student.classNum,
      studentNum: student.studentNum,
      name: student.name,
      defaultSupportLevel: student.defaultSupportLevel,
    },
  };
}

export const authService = {
  loginAdmin(credentials: AdminCredentials): User {
    if (
      credentials.username.trim().toLocaleLowerCase() ===
        ADMIN_CREDENTIALS.username.toLocaleLowerCase() &&
      credentials.password.trim() === ADMIN_CREDENTIALS.password
    ) {
      const user: User = {
        role: 'admin',
        admin: { username: ADMIN_CREDENTIALS.username },
      };
      saveUser(user);
      return user;
    }
    throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
  },

  loginStudent(credentials: StudentCredentials): User {
    const student = studentService.findStudent(
      Number(credentials.grade),
      Number(credentials.classNum),
      Number(credentials.studentNum),
    );

    if (student && credentials.password.trim() === student.password) {
      const user = createStudentUser(student);
      if (user) {
        saveUser(user);
        return user;
      }
    }
    throw new Error('학생 정보 또는 비밀번호가 올바르지 않습니다.');
  },

  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      const user = JSON.parse(stored) as User;
      if (user.role !== 'student' || !user.student) return user;

      const latest =
        studentService.getLatestStudentProfile(user.student.id) ||
        studentService.getLatestStudentProfile({
          grade: user.student.grade,
          classNum: user.student.classNum,
          studentNum: user.student.studentNum,
        });
      const refreshed = createStudentUser(latest);
      if (!refreshed) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      saveUser(refreshed);
      return refreshed;
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
