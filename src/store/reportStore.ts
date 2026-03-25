import { create } from 'zustand';

export interface Report {
  id: string;
  userId: string;
  date: string;     
  category: string; 
  content: string;
  mh: number;
  progress: number;
  type: 'done' | 'todo';
  periodType: 'daily' | 'weekly' | 'monthly';
  isPlanned: boolean; // 추가됨!
}

interface ReportState {
  reports: Report[];
  addReport: (r: Omit<Report, 'id'>) => void;
  deleteReport: (id: string) => void;
  updateReport: (id: string, updated: Partial<Report>) => void;
}

export const useReportStore = create<ReportState>((set) => ({
  reports: [
    { id: 'r1', userId: 'watchtek', date: '2026-03-25', category: '개발 > 프론트엔드 변경', content: '공통 UI 및 데드락 픽스', mh: 4, progress: 100, type: 'done', periodType: 'daily', isPlanned: true },
    { id: 'r2', userId: 'watchtek', date: '2026-03-25', category: '기획 > 설계', content: '대시보드 통합 뷰 1차 스케치', mh: 4, progress: 30, type: 'todo', periodType: 'daily', isPlanned: true },
  ],
  addReport: (r) => set((state) => ({
    reports: [...state.reports, { ...r, id: Math.random().toString(36).slice(2) }]
  })),
  deleteReport: (id) => set((state) => ({
    reports: state.reports.filter((r) => r.id !== id)
  })),
  updateReport: (id, updated) => set((state) => ({
    reports: state.reports.map((r) => r.id === id ? { ...r, ...updated } : r)
  }))
}));
