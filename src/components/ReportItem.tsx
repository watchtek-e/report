import { useState } from 'react';
import { Report, useReportStore } from '../store/reportStore';
import { useSystemStore } from '../store/systemStore';
import { Button } from './Button';
import { Input } from './Input';
import './ReportItem.css';

export const ReportItem = ({ report, isReadOnly = false }: { report: Report, isReadOnly?: boolean }) => {
  const { updateReport, deleteReport } = useReportStore();
  const { categories } = useSystemStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(report);

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
          {report.periodType !== 'weekly' && (
            <div style={{ minWidth: '80px', flex: '0 0 80px' }}>
              <Input 
                label="시간(MH)"
                type="number" 
                value={editData.mh?.toString() || ''} 
                onChange={e => setEditData({...editData, mh: Number(e.target.value)})} 
              />
            </div>
          )}
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
      </div>
    );
  }

  const [mainCat, subCat] = report.category.split(' > ');

  return (
    <div className="report-item">
      <div className="report-info">
        <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
          <span style={{ fontWeight: 600, color: '#2563eb', backgroundColor: '#dbeafe', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.8rem' }}>[{mainCat}]</span>
          {subCat && subCat !== '미지정' && <span style={{ fontWeight: 600, color: '#0ea5e9', backgroundColor: '#e0f2fe', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.8rem' }}>[{subCat}]</span>}
        </div>
        {report.isPlanned && <span style={{ flexShrink: 0, fontSize: '0.75rem', backgroundColor: '#e0e7ff', color: '#3730a3', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>[계획됨]</span>}
        
        <span className="report-content">{report.content}</span>
        
        {report.type === 'done' ? (
          <span className="report-stats done-stats" style={{ marginLeft: 'auto', flexShrink: 0 }}>
            {report.periodType !== 'weekly' ? `${report.mh}MH / ` : ''}진행률 {report.progress}%
          </span>
        ) : (
          <span className="report-stats todo-stats" style={{ marginLeft: 'auto', flexShrink: 0 }}>
            {report.periodType === 'monthly' ? `${(report.mh/8).toFixed(1)}MD / ` : report.periodType !== 'weekly' ? `${report.mh}MH / ` : ''}예상 {report.progress}%
          </span>
        )}
      </div>
      {!isReadOnly && (
        <div className="report-actions">
          <button onClick={() => setIsEditing(true)} className="action-btn text-blue">수정</button>
          <button onClick={() => { if (confirm('삭제하시겠습니까?')) deleteReport(report.id); }} className="action-btn text-red">삭제</button>
        </div>
      )}
    </div>
  );
};
