import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface User {
  id: string;
  name: string;
  department: string;
  part?: string;
  position: string;
}

interface StoredUser extends User {
  pw: string;
}

interface UserState {
  currentUser: User | null;
  customUsers: Record<string, StoredUser>;
  unsubscribeUsers: (() => void) | null;
  startUserSync: () => void;
  stopUserSync: () => void;
  login: (id: string, pw: string) => boolean;
  register: (payload: StoredUser) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

const MOCK_USERS: Record<string, StoredUser> = {
  'admin': { id: 'admin', pw: '1234', name: '관리자', department: '개발팀', part: '프론트엔드', position: '선임' },
  'test': { id: 'test', pw: '1234', name: '테스터', department: '기획팀', position: '사원' },
  'watchtek': { id: 'watchtek', pw: '1234', name: '워치텍', department: '솔루션본부', part: 'A 파트', position: '파트장' }
};

const toUser = (user: StoredUser): User => ({
  id: user.id,
  name: user.name,
  department: user.department,
  part: user.part,
  position: user.position,
});

const usersCollectionRef = collection(db, 'users');

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      customUsers: {},
      unsubscribeUsers: null,

      startUserSync: () => {
        get().unsubscribeUsers?.();

        const unsubscribe = onSnapshot(
          usersCollectionRef,
          (snapshot) => {
            const nextUsers = snapshot.docs.reduce<Record<string, StoredUser>>((acc, snapshotDoc) => {
              const data = snapshotDoc.data() as Partial<StoredUser>;
              if (!data.id || !data.pw) {
                return acc;
              }

              acc[data.id] = {
                id: data.id,
                pw: data.pw,
                name: data.name ?? data.id,
                department: data.department ?? '',
                part: data.part,
                position: data.position ?? '',
              };
              return acc;
            }, {});

            set({ customUsers: nextUsers });
          },
          (error) => {
            console.error('Failed to sync users:', error);
          },
        );

        set({ unsubscribeUsers: unsubscribe });
      },

      stopUserSync: () => {
        get().unsubscribeUsers?.();
        set({ unsubscribeUsers: null });
      },

      login: (id, pw) => {
        const user = get().customUsers[id] ?? MOCK_USERS[id];
        if (user && user.pw === pw) {
          set({ currentUser: toUser(user) });
          return true;
        }
        return false;
      },
      register: async (payload) => {
        const trimmedId = payload.id.trim();
        if (!trimmedId) {
          return { ok: false, message: '아이디를 입력해 주세요.' };
        }

        if (MOCK_USERS[trimmedId] || get().customUsers[trimmedId]) {
          return { ok: false, message: '이미 사용 중인 아이디입니다.' };
        }

        const normalized: StoredUser = {
          ...payload,
          id: trimmedId,
          name: payload.name.trim(),
          department: payload.department.trim(),
          part: payload.part?.trim(),
          position: payload.position.trim(),
        };

        await setDoc(doc(db, 'users', normalized.id), normalized, { merge: true });

        return { ok: true };
      },
      logout: () => set({ currentUser: null }),
      updateProfile: (data) => set((state) => ({
        currentUser: state.currentUser ? { ...state.currentUser, ...data } : null,
        customUsers: state.currentUser && state.customUsers[state.currentUser.id]
          ? {
            ...state.customUsers,
            [state.currentUser.id]: {
              ...state.customUsers[state.currentUser.id],
              ...data,
            },
          }
          : state.customUsers,
      }))
    }),
    {
      name: 'watchtek-user-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentUser: state.currentUser,
        customUsers: state.customUsers,
      }),
    },
  ),
);
