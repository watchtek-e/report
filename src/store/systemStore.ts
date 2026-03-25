import { create } from 'zustand';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
  isLoading: boolean;
  unsubscribeSystem: (() => void) | null;
  startSystemSync: () => void;
  stopSystemSync: () => void;
  
  addCategory: (mainType: string) => Promise<void>;
  updateCategory: (id: string, mainType: string) => Promise<void>;
  duplicateCategory: (id: string) => Promise<void>;
  reorderCategory: (dragId: string, dropId: string) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  addSubCategory: (categoryId: string, subName: string) => Promise<void>;
  updateSubCategory: (categoryId: string, subId: string, subName: string) => Promise<void>;
  reorderSubCategory: (categoryId: string, dragSubId: string, dropSubId: string) => Promise<void>;
  removeSubCategory: (categoryId: string, subId: string) => Promise<void>;
  
  addHoliday: (dateStr: string) => Promise<void>;
  removeHoliday: (dateStr: string) => Promise<void>;
}

const DEFAULT_CATEGORIES: TaskCategory[] = [
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
];

const DEFAULT_HOLIDAYS = ['2026-03-01'];
const systemDocRef = doc(db, 'system', 'shared');

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

export const useSystemStore = create<SystemState>((set) => ({
  categories: DEFAULT_CATEGORIES,
  holidays: DEFAULT_HOLIDAYS,
  isLoading: false,
  unsubscribeSystem: null,

  startSystemSync: () => {
    useSystemStore.getState().unsubscribeSystem?.();
    set({ isLoading: true });

    const unsubscribe = onSnapshot(
      systemDocRef,
      async (snapshot) => {
        if (!snapshot.exists()) {
          await setDoc(systemDocRef, { categories: DEFAULT_CATEGORIES, holidays: DEFAULT_HOLIDAYS });
          return;
        }

        const data = snapshot.data() as Partial<Pick<SystemState, 'categories' | 'holidays'>>;
        set({
          categories: data.categories ?? DEFAULT_CATEGORIES,
          holidays: data.holidays ?? DEFAULT_HOLIDAYS,
          isLoading: false,
        });
      },
      (error) => {
        console.error('Failed to sync system settings:', error);
        set({ isLoading: false });
      },
    );

    set({ unsubscribeSystem: unsubscribe });
  },

  stopSystemSync: () => {
    useSystemStore.getState().unsubscribeSystem?.();
    set({ unsubscribeSystem: null, isLoading: false });
  },

  addCategory: async (mainType) => {
    const nextCategories = [...useSystemStore.getState().categories, { id: createId(), mainType, subTypes: [] }];
    await setDoc(systemDocRef, { categories: nextCategories }, { merge: true });
  },

  updateCategory: async (id, mainType) => {
    const nextCategories = useSystemStore.getState().categories.map((category) => {
      if (category.id !== id) return category;
      return {
        ...category,
        mainType,
      };
    });

    await setDoc(systemDocRef, { categories: nextCategories }, { merge: true });
  },

  duplicateCategory: async (id) => {
    const target = useSystemStore.getState().categories.find((category) => category.id === id);
    if (!target) return;

    const copiedCategory: TaskCategory = {
      id: createId(),
      mainType: `${target.mainType} copy`,
      subTypes: target.subTypes.map((subType) => ({
        id: createId(),
        name: subType.name,
      })),
    };

    const nextCategories = [...useSystemStore.getState().categories, copiedCategory];
    await setDoc(systemDocRef, { categories: nextCategories }, { merge: true });
  },

  reorderCategory: async (dragId, dropId) => {
    const categories = [...useSystemStore.getState().categories];
    const fromIndex = categories.findIndex((category) => category.id === dragId);
    const toIndex = categories.findIndex((category) => category.id === dropId);
    if (fromIndex < 0) return;
    if (toIndex < 0 || fromIndex === toIndex) return;

    const [target] = categories.splice(fromIndex, 1);
    categories.splice(toIndex, 0, target);
    await setDoc(systemDocRef, { categories }, { merge: true });
  },

  removeCategory: async (id) => {
    const nextCategories = useSystemStore.getState().categories.filter((category) => category.id !== id);
    await setDoc(systemDocRef, { categories: nextCategories }, { merge: true });
  },

  addSubCategory: async (categoryId, subName) => {
    const nextCategories = useSystemStore.getState().categories.map((category) => {
      if (category.id !== categoryId) return category;
      return {
        ...category,
        subTypes: [...category.subTypes, { id: createId(), name: subName }],
      };
    });

    await setDoc(systemDocRef, { categories: nextCategories }, { merge: true });
  },

  updateSubCategory: async (categoryId, subId, subName) => {
    const nextCategories = useSystemStore.getState().categories.map((category) => {
      if (category.id !== categoryId) return category;
      return {
        ...category,
        subTypes: category.subTypes.map((subType) => {
          if (subType.id !== subId) return subType;
          return {
            ...subType,
            name: subName,
          };
        }),
      };
    });

    await setDoc(systemDocRef, { categories: nextCategories }, { merge: true });
  },

  reorderSubCategory: async (categoryId, dragSubId, dropSubId) => {
    const nextCategories = useSystemStore.getState().categories.map((category) => {
      if (category.id !== categoryId) return category;

      const subTypes = [...category.subTypes];
      const fromIndex = subTypes.findIndex((subType) => subType.id === dragSubId);
      const toIndex = subTypes.findIndex((subType) => subType.id === dropSubId);
      if (fromIndex < 0) return category;
      if (toIndex < 0 || fromIndex === toIndex) return category;

      const [target] = subTypes.splice(fromIndex, 1);
      subTypes.splice(toIndex, 0, target);

      return {
        ...category,
        subTypes,
      };
    });

    await setDoc(systemDocRef, { categories: nextCategories }, { merge: true });
  },

  removeSubCategory: async (categoryId, subId) => {
    const nextCategories = useSystemStore.getState().categories.map((category) => {
      if (category.id !== categoryId) return category;
      return {
        ...category,
        subTypes: category.subTypes.filter((subType) => subType.id !== subId),
      };
    });

    await setDoc(systemDocRef, { categories: nextCategories }, { merge: true });
  },

  addHoliday: async (dateStr) => {
    const prevHolidays = useSystemStore.getState().holidays;
    const nextHolidays = prevHolidays.includes(dateStr) ? prevHolidays : [...prevHolidays, dateStr];
    await setDoc(systemDocRef, { holidays: nextHolidays }, { merge: true });
  },

  removeHoliday: async (dateStr) => {
    const nextHolidays = useSystemStore.getState().holidays.filter((holiday) => holiday !== dateStr);
    await setDoc(systemDocRef, { holidays: nextHolidays }, { merge: true });
  },
}));
