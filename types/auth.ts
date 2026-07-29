export type Role = 'student' | 'admin';
export type SupportLevel = 1 | 2 | 3;

export interface StudentInfo {
  id: string;
  grade: number;
  classNum: number;
  studentNum: number;
  name: string;
  defaultSupportLevel: SupportLevel;
}

export interface StudentRecord extends StudentInfo {
  password: string;
  isDemo?: boolean;
}

export interface StudentFormData {
  name: string;
  grade: number;
  classNum: number;
  studentNum: number;
  password?: string;
  defaultSupportLevel: SupportLevel;
}

export interface AdminInfo {
  username: string;
}

export interface User {
  role: Role;
  student?: StudentInfo;
  admin?: AdminInfo;
}

export interface StudentCredentials {
  grade: string;
  classNum: string;
  studentNum: string;
  password: string;
}

export interface AdminCredentials {
  username: string;
  password: string;
}
