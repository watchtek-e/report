import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useReportStore } from '../store/reportStore';
import { useSystemStore } from '../store/systemStore';
import { useUserStore } from '../store/userStore';
import { ReportSplitView } from '../components/ReportSplitView';
import { format } from 'date-fns';
import './DailyReport.css';

export const DailyReport = () => {
  const { reports, addReport } = useReportStore();
  const { categories, holidays } = useSystemStore();
  const { currentUser } = useUserStore();

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [type, setType] = useState<'done' | 'todo'>('done');

  const [mainType, setMainType] = useState(categories.length > 0 ? categories[0].id : '');
  const [subType, setSubType] = useState('');
  const [mh, setMh] = useState('');
  const [progress, setProgress] = useState('');
  const [isPlanned, setIsPlanned] = useState(true);
  const [content, setContent] = useState('');

  const selectedMain = categories.find(c => c.id === mainType);
  const subOptions = selectedMain?.subTypes ?? [];

  const handleMainChange = (val: string) => { setMainType(val); setSubType(''); };

  const buildCategory = () => {
    const main = categories.find(c => c.id === mainType)?.mainType ?? '기타';
    const sub = subOptions.find(s => s.id === subType)?.name;
    return sub ? `${main} > ${sub}` : `${main} > 미지정`;
  };

  const todayReports = reports.filter(r => r.date === selectedDate && r.periodType === 'daily' && r.userId === currentUser?.id);
  const isHoliday = holidays.includes(selectedDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    addReport({
      userId: currentUser.id,
      date: selectedDate,
      category: buildCategory(),
      content,
      mh: Number(mh),
      progress: Number(progress) || 0,
      type,
      periodType: 'daily',
      isPlanned
    });
    setContent('');
    setMh('');
    setProgress('');
  };

  return (
    <div className="daily-report-page">
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        {isHoliday && <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.85rem' }}>🚨 공휴일</span>}
        <div style={{ fontSize: '0.82rem' }}>
          <Input type="date" label="" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          type="button"
          onClick={() => setType('done')}
          style={{
            padding: '0.5rem 1.25rem', borderRadius: '999px', border: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
            backgroundColor: type === 'done' ? '#2563eb' : '#e5e7eb',
            color: type === 'done' ? '#fff' : '#374151',
            transition: 'all 0.15s'
          }}
        >업무 결과</button>
        <button
          type="button"
          onClick={() => setType('todo')}
          style={{
            padding: '0.5rem 1.25rem', borderRadius: '999px', border: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
            backgroundColor: type === 'todo' ? '#f59e0b' : '#e5e7eb',
            color: type === 'todo' ? '#fff' : '#374151',
            transition: 'all 0.15s'
          }}
        >업무 계획</button>
      </div>

      <Card className="p-4 mb-4" style={{ backgroundColor: type === 'todo' ? '#fefce8' : '#f0fdf4' }}>
        <form onSubmit={handleSubmit} className="report-form">
          {/* 1행: 유형 / 세부유형 / MH / 진행률 / 체크박스 / 추가버튼 */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
            <div className="ui-input-container" style={{ flex: '0 0 250px' }}>
              <label className="ui-input-label" style={{ fontSize: '0.78rem' }}>유형</label>
              <select className="ui-input" value={mainType} onChange={e => handleMainChange(e.target.value)}>
                {categories.length === 0 && <option value="">분류 없음</option>}
                {categories.map(c => <option key={c.id} value={c.id}>{c.mainType}</option>)}
              </select>
            </div>
            <div className="ui-input-container" style={{ flex: '0 0 250px' }}>
              <label className="ui-input-label" style={{ fontSize: '0.78rem' }}>세부유형</label>
              <select className="ui-input" value={subType} onChange={e => setSubType(e.target.value)}>
                <option value="">미지정</option>
                {subOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ flex: '0 0 80px' }}>
              <Input label="공수(MH)" type="number" min="0" step="0.5" value={mh} onChange={e => setMh(e.target.value)} placeholder="0" required />
            </div>
            <div style={{ flex: '0 0 80px' }}>
              <Input label="진행률(%)" type="number" min="0" max="100" value={progress} onChange={e => setProgress(e.target.value)} placeholder="0" required />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', paddingBottom: '4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={isPlanned} onChange={e => setIsPlanned(e.target.checked)} style={{ width: '15px', height: '15px' }} />
                계획작업
              </label>
            </div>
            <div style={{ paddingBottom: '2px', marginLeft: 'auto' }}>
              <Button type="submit" size="sm">✔</Button>
            </div>
          </div>
          {/* 2행: 업무 일감 내용 (전체 한 줄) */}
          <Input
            label="업무 일감 내용"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="예: 메인 페이지 레이아웃 컴포넌트 개발 및 스타일 작업"
            required
          />
        </form>
      </Card>

      <Card title={`일간 업무 리스트 (${selectedDate})`} className="mb-4">
        <ReportSplitView reports={todayReports} />
      </Card>
    </div>
  );
};
