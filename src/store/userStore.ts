import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  department: string;
  part?: string;
  position: string;
}

interface UserState {
  currentUser: User | null;
  login: (id: string, pw: string) => boolean;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

const MOCK_USERS: Record<string, User & { pw: string }> = {
  'admin': { id: 'admin', pw: '1234', name: '관리자', department: '개발팀', part: '프론트엔드', position: '선임' },
  'test': { id: 'test', pw: '1234', name: '테스터', department: '기획팀', position: '사원' },
  'watchtek': { id: 'watchtek', pw: '1234', name: '워치텍', department: '솔루션본부', part: 'A 파트', position: '파트장' }
};

export const useUserStore = create<UserState>((set) => ({
  currentUser: null,
  login: (id, pw) => {
    const user = MOCK_USERS[id];
    if (user && user.pw === pw) {
      const { pw: _, ...userData } = user;
      set({ currentUser: userData });
      return true;
    }
    return false;
  },
  logout: () => set({ currentUser: null }),
  updateProfile: (data) => set((state) => ({
    currentUser: state.currentUser ? { ...state.currentUser, ...data } : null
  }))
}));
