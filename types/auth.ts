export type Role = 'student' | 'admin';

export interface StudentInfo {
  grade: number;
  classNum: number;
  studentNum: number;
  name: string;
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
