import { create } from 'zustand';

export interface SubCategory {
  id: string;
  name: string;
}

export interface TaskCategory {
  id: string;
  mainType: string;
  subTypes: SubCategory[];
}

interface SystemState {
  categories: TaskCategory[];
  holidays: string[]; // 공휴일 날짜 ('yyyy-MM-dd')
  
  addCategory: (mainType: string) => void;
  removeCategory: (id: string) => void;
  addSubCategory: (categoryId: string, subName: string) => void;
  removeSubCategory: (categoryId: string, subId: string) => void;
  
  addHoliday: (dateStr: string) => void;
  removeHoliday: (dateStr: string) => void;
}

export const useSystemStore = create<SystemState>((set) => ({
  categories: [
    { 
      id: 'c1', mainType: '프로젝트 1', 
      subTypes: [
        { id: 's1', name: '기획' }, { id: 's2', name: '설계' }, { id: 's3', name: '개발' },
        { id: 's4', name: '테스트' }, { id: 's5', name: '문서작성' }, { id: 's6', name: '회의' }, { id: 's7', name: '기타' }
      ]
    },
    { 
      id: 'c2', mainType: '고객지원', 
      subTypes: [{ id: 's8', name: '사이트1' }, { id: 's9', name: '사이트2' }]
    },
    { id: 'c3', mainType: '유지보수', subTypes: [] },
    { id: 'c4', mainType: '교육', subTypes: [] },
    { id: 'c5', mainType: '연차', subTypes: [] },
    { id: 'c6', mainType: '기타', subTypes: [] }
  ],
  holidays: ['2026-03-01'], // 3월 예시 휴일(공휴일)
  addCategory: (mainType) => set((state) => ({
    categories: [...state.categories, { id: Math.random().toString(36).slice(2), mainType, subTypes: [] }]
  })),
  removeCategory: (id) => set((state) => ({
    categories: state.categories.filter((c) => c.id !== id)
  })),
  addSubCategory: (categoryId, subName) => set((state) => ({
    categories: state.categories.map((c) => c.id === categoryId ? {
      ...c, subTypes: [...c.subTypes, { id: Math.random().toString(36).slice(2), name: subName }]
    } : c)
  })),
  removeSubCategory: (categoryId, subId) => set((state) => ({
    categories: state.categories.map((c) => c.id === categoryId ? {
      ...c, subTypes: c.subTypes.filter(s => s.id !== subId)
    } : c)
  })),
  addHoliday: (dateStr) => set((state) => ({
    holidays: state.holidays.includes(dateStr) ? state.holidays : [...state.holidays, dateStr]
  })),
  removeHoliday: (dateStr) => set((state) => ({
    holidays: state.holidays.filter(d => d !== dateStr)
  }))
}));
