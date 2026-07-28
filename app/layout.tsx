import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI 교과 디딤돌 - 초등 맞춤형 비계 학습 지원',
  description: '초등 국어·수학·사회·과학의 원문을 이해할 수 있도록 필요한 만큼의 비계(Scaffolding)를 제공하는 학습 지원 웹사이트',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
