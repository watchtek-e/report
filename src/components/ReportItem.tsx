import { useState } from 'react';
import { Report, useReportStore } from '../store/reportStore';
import { useSystemStore } from '../store/systemStore';
import { Button } from './Button';
import { Input } from './Input';
import './ReportItem.css';

const WEEKDAY_OPTIONS = [
  { value: 1, label: '월' },
  { value: 2, label: '화' },
  { value: 3, label: '수' },
  { value: 4, label: '목' },
  { value: 5, label: '금' },
];

interface ReportItemProps {
  report: Report;
  isReadOnly?: boolean;
  forceMdForDone?: boolean;
  userName?: string;
}

export const ReportItem = ({ report, isReadOnly = false, forceMdForDone = false, userName = '' }: ReportItemProps) => {
  const { updateReport, deleteReport } = useReportStore();
  const { categories } = useSystemStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(report);
  const isMdPeriod = report.periodType === 'weekly' || report.periodType === 'monthly';

  // 편집 모드용 유형/세부유형 파싱
  const parsedCategory = report.category.split(' > ');
  const initialMain = categories.find(c => c.mainType === parsedCategory[0]);
  const [editMainType, setEditMainType] = useState(initialMain?.id ?? (categories.length > 0 ? categories[0].id : ''));
  const [editSubType, setEditSubType] = useState(() => {
    const main = categories.find(c => c.mainType === parsedCategory[0]);
    const sub = main?.subTypes.find(s => s.name === parsedCategory[1]);
    return sub?.id ?? '';
  });

  const editMainCategory = categories.find(c => c.id === editMainType);
  const editSubOptions = editMainCategory?.subTypes ?? [];
  const editableMonthWeekCount = Math.max(5, ...(editData.planWeeks ?? [0]));

  const handleSave = () => {
    const main = categories.find(c => c.id === editMainType)?.mainType ?? '기타';
    const sub = editSubOptions.find(s => s.id === editSubType)?.name;
    const category = sub ? `${main} > ${sub}` : `${main} > 미지정`;
    updateReport(report.id, { ...editData, category });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="report-item-edit">
        {/* 1행: 유형 + 세부유형 + 내용 */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
          <div className="ui-input-container" style={{ minWidth: '120px', flex: '0 0 120px' }}>
            <label className="ui-input-label">유형</label>
            <select
              className="ui-input"
              value={editMainType}
              onChange={e => { setEditMainType(e.target.value); setEditSubType(''); }}
            >
              {categories.map(c => <option key={c.id} value={c.id}>{c.mainType}</option>)}
            </select>
          </div>
          <div className="ui-input-container" style={{ minWidth: '120px', flex: '0 0 120px' }}>
            <label className="ui-input-label">세부유형</label>
            <select className="ui-input" value={editSubType} onChange={e => setEditSubType(e.target.value)}>
              <option value="">미지정</option>
              {editSubOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <Input 
              label="업무 내용"
              value={editData.content} 
              onChange={e => setEditData({...editData, content: e.target.value})} 
            />
          </div>
        </div>
        {/* 2행: 수치 + 체크박스 + 버튼 */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: '80px', flex: '0 0 80px' }}>
            <Input 
              label={isMdPeriod ? '공수(MD)' : '시간(MH)'}
              type="number" 
              step="0.5"
              value={isMdPeriod ? ((editData.mh ?? 0) / 8).toString() : (editData.mh?.toString() || '')}
              onChange={e => setEditData({...editData, mh: isMdPeriod ? Number(e.target.value) * 8 : Number(e.target.value)})} 
            />
          </div>
          <div style={{ minWidth: '80px', flex: '0 0 80px' }}>
            <Input 
              label="진행률(%)"
              type="number" 
              value={editData.progress?.toString() || ''} 
              onChange={e => setEditData({...editData, progress: Number(e.target.value)})} 
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', paddingBottom: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
              <input type="checkbox" checked={editData.isPlanned} onChange={e => setEditData({...editData, isPlanned: e.target.checked})} style={{ width: '16px', height: '16px' }} />
              계획작업
            </label>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button onClick={handleSave} size="sm">저장</Button>
            <Button variant="secondary" onClick={() => setIsEditing(false)} size="sm">취소</Button>
          </div>
        </div>

        {report.type === 'todo' && report.periodType === 'weekly' && (
          <div style={{ marginTop: '0.75rem' }}>
            <label className="ui-input-label" style={{ display: 'block', marginBottom: '0.35rem' }}>수행 요일</label>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {WEEKDAY_OPTIONS.map((day) => (
                <label key={day.value} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={(editData.planWeekdays ?? []).includes(day.value)}
                    onChange={(e) => {
                      const current = editData.planWeekdays ?? [];
                      const next = e.target.checked
                        ? [...current, day.value].sort((a, b) => a - b)
                        : current.filter((value) => value !== day.value);
                      setEditData({ ...editData, planWeekdays: next });
                    }}
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {report.type === 'todo' && report.periodType === 'monthly' && (
          <div style={{ marginTop: '0.75rem' }}>
            <label className="ui-input-label" style={{ display: 'block', marginBottom: '0.35rem' }}>수행 주차</label>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {Array.from({ length: editableMonthWeekCount }, (_, index) => index + 1).map((weekNo) => (
                <label key={weekNo} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={(editData.planWeeks ?? []).includes(weekNo)}
                    onChange={(e) => {
                      const current = editData.planWeeks ?? [];
                      const next = e.target.checked
                        ? [...current, weekNo].sort((a, b) => a - b)
                        : current.filter((value) => value !== weekNo);
                      setEditData({ ...editData, planWeeks: next });
                    }}
                  />
                  {weekNo}주차
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const [mainCat, subCat] = report.category.split(' > ');

  const effortMh = Number(report.mh || 0);
  const effortMd = Number((effortMh / 8).toFixed(1));
  const doneEffortText = forceMdForDone || report.periodType === 'weekly' || report.periodType === 'monthly'
    ? `${effortMd}MD / `
    : `${effortMh}MH / `;

  // Extract ticket number and description
  const contentMatch = report.content.match(/^(#\d+)\s*(.*)$/);
  const ticketNumber = contentMatch ? contentMatch[1] : '';
  const description = contentMatch ? contentMatch[2] : report.content;
  const effortLabel = report.type === 'done' ? `진행률 ${report.progress}%` : `예상 ${report.progress}%`;
  const weekdayLabel = report.planWeekdays && report.planWeekdays.length > 0
    ? ` / ${report.planWeekdays
      .slice()
      .sort((a, b) => a - b)
      .map((day) => ['월', '화', '수', '목', '금'][day - 1])
      .join(',')}`
    : '';
  const weekLabel = report.planWeeks && report.planWeeks.length > 0
    ? ` / ${report.planWeeks.slice().sort((a, b) => a - b).map((weekNo) => `${weekNo}주차`).join(',')}`
    : '';
  const scheduleLabel = report.type === 'todo'
    ? (report.periodType === 'weekly' ? weekdayLabel : report.periodType === 'monthly' ? weekLabel : '')
    : '';

  return (
    <div className="report-item">
      {/* First line: Categories + Status + Effort + Username */}
      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', marginBottom: '0.3rem' }}>
        <span style={{ fontWeight: 600, color: '#2563eb', backgroundColor: '#dbeafe', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>[{mainCat}]</span>
        {subCat && subCat !== '미지정' && <span style={{ fontWeight: 600, color: '#0ea5e9', backgroundColor: '#e0f2fe', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>[{subCat}]</span>}
        {report.isPlanned && <span style={{ flexShrink: 0, fontSize: '0.75rem', backgroundColor: '#e0e7ff', color: '#3730a3', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600, whiteSpace: 'nowrap' }}>[계획됨]</span>}
        <span style={{ fontSize: '0.9rem', color: '#6b7280', whiteSpace: 'nowrap' }}>({doneEffortText}{effortLabel}{scheduleLabel})</span>
        {userName && <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#6b7280', fontWeight: 500 }}>{userName}</span>}
      </div>
      
      {/* Second line: Ticket + Description + Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', color: '#374151' }}>
        <div>
          {ticketNumber && <span style={{ fontWeight: 600, color: '#6366f1' }}>{ticketNumber} </span>}
          {description}
        </div>

        {!isReadOnly && (
          <div className="report-actions">
            <button onClick={() => setIsEditing(true)} className="action-btn text-blue">수정</button>
            <button onClick={() => { if (confirm('삭제하시겠습니까?')) deleteReport(report.id); }} className="action-btn text-red">삭제</button>
          </div>
        )}
      </div>
    </div>
  );
};
