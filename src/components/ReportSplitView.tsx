import { Report } from '../store/reportStore';
import { ReportItem } from './ReportItem';
import './ReportSplitView.css';

interface ReportSplitViewProps {
  reports: Report[];
  todoReadOnly?: boolean;
  doneReadOnly?: boolean;
  todoSummaryText?: string;
  doneSummaryText?: string;
  forceMdForDone?: boolean;
  usersMap?: Record<string, { name: string }>;
}

export const ReportSplitView = ({
  reports,
  todoReadOnly = false,
  doneReadOnly = false,
  todoSummaryText,
  doneSummaryText,
  forceMdForDone = false,
  usersMap = {},
}: ReportSplitViewProps) => {
  const todoReports = reports.filter(r => r.type === 'todo');
  const doneReports = reports.filter(r => r.type === 'done');

  return (
    <div className="split-view-container">
      <div className="split-col split-todo">
        <h4 className="split-title" style={{ borderColor: '#cbd5e1', color: '#1e293b' }}>
          계획 업무
          <span className="split-count" style={{color: '#475569'}}>{todoReports.length}건</span>
          {todoSummaryText ? <span className="split-count" style={{color: '#64748b'}}> {todoSummaryText}</span> : null}
        </h4>
        {todoReports.length === 0 ? (
          <p className="empty-text">등록된 계획이 없습니다.</p>
        ) : (
          <div className="split-list">
            {todoReports.map(r => (
              <ReportItem
                key={r.id}
                report={r}
                isReadOnly={todoReadOnly}
                usersMap={usersMap}
              />
            ))}
          </div>
        )}
      </div>

      <div className="split-col split-done">
        <h4 className="split-title" style={{ borderColor: '#86efac', color: '#166534' }}>
          결과 업무
          <span className="split-count" style={{color: '#15803d'}}>{doneReports.length}건</span>
          {doneSummaryText ? <span className="split-count" style={{color: '#166534'}}> {doneSummaryText}</span> : null}
        </h4>
        {doneReports.length === 0 ? (
          <p className="empty-text">등록된 실적이 없습니다.</p>
        ) : (
          <div className="split-list">
            {doneReports.map(r => (
              <ReportItem
                key={r.id}
                report={r}
                isReadOnly={doneReadOnly}
                forceMdForDone={forceMdForDone}
                usersMap={usersMap}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
