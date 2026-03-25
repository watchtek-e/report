import { create } from 'zustand';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
  isLoading: boolean;
  unsubscribeReports: (() => void) | null;
  startReportSync: (userId: string) => void;
  stopReportSync: () => void;
  addReport: (r: Omit<Report, 'id'>) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
  updateReport: (id: string, updated: Partial<Report>) => Promise<void>;
}

const reportsCollectionRef = collection(db, 'reports');

export const useReportStore = create<ReportState>((set, get) => ({
  reports: [],
  isLoading: false,
  unsubscribeReports: null,

  startReportSync: (userId) => {
    get().unsubscribeReports?.();
    set({ isLoading: true });

    const q = query(reportsCollectionRef, where('userId', '==', userId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const nextReports = snapshot.docs
          .map((snapshotDoc) => ({ id: snapshotDoc.id, ...(snapshotDoc.data() as Omit<Report, 'id'>) }))
          .sort((a, b) => b.date.localeCompare(a.date));

        set({ reports: nextReports, isLoading: false });
      },
      (error) => {
        console.error('Failed to sync reports:', error);
        set({ isLoading: false });
      },
    );

    set({ unsubscribeReports: unsubscribe });
  },

  stopReportSync: () => {
    get().unsubscribeReports?.();
    set({ unsubscribeReports: null, reports: [], isLoading: false });
  },

  addReport: async (report) => {
    await addDoc(reportsCollectionRef, report);
  },

  deleteReport: async (id) => {
    await deleteDoc(doc(db, 'reports', id));
  },

  updateReport: async (id, updated) => {
    const safeUpdated = Object.fromEntries(
      Object.entries(updated).filter(([key]) => key !== 'id'),
    );
    await updateDoc(doc(db, 'reports', id), safeUpdated);
  },
}));
