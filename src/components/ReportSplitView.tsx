import React from 'react';
import { Report } from '../store/reportStore';
import { ReportItem } from './ReportItem';
import './ReportSplitView.css';

interface ReportSplitViewProps {
  reports: Report[];
  todoReadOnly?: boolean;
  doneReadOnly?: boolean;
}

export const ReportSplitView = ({ reports, todoReadOnly = false, doneReadOnly = false }: ReportSplitViewProps) => {
  const todoReports = reports.filter(r => r.type === 'todo');
  const doneReports = reports.filter(r => r.type === 'done');

  return (
    <div className="split-view-container">
      <div className="split-col split-todo">
        <h4 className="split-title" style={{ borderColor: '#cbd5e1', color: '#1e293b' }}>
          진행할 업무 (계획/To-do) <span className="split-count" style={{color: '#475569'}}>{todoReports.length}건</span>
        </h4>
        {todoReports.length === 0 ? (
          <p className="empty-text">등록된 계획이 없습니다.</p>
        ) : (
          <div className="split-list">
            {todoReports.map(r => <ReportItem key={r.id} report={r} isReadOnly={todoReadOnly} />)}
          </div>
        )}
      </div>

      <div className="split-col split-done">
        <h4 className="split-title" style={{ borderColor: '#86efac', color: '#166534' }}>
          진행한 업무 (결과/Done) <span className="split-count" style={{color: '#15803d'}}>{doneReports.length}건</span>
        </h4>
        {doneReports.length === 0 ? (
          <p className="empty-text">등록된 실적이 없습니다.</p>
        ) : (
          <div className="split-list">
            {doneReports.map(r => <ReportItem key={r.id} report={r} isReadOnly={doneReadOnly} />)}
          </div>
        )}
      </div>
    </div>
  );
};
