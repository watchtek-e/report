import React, { useState, useMemo } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useReportStore } from '../store/reportStore';
import { useSystemStore } from '../store/systemStore';
import { useUserStore } from '../store/userStore';
import { ReportSplitView } from '../components/ReportSplitView';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, getWeekOfMonth, getMonth } from 'date-fns';
import './WeeklyReport.css';

export const WeeklyReport = () => {
  const { reports, addReport } = useReportStore();
  const { categories } = useSystemStore();
  const { currentUser } = useUserStore();

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [mainType, setMainType] = useState(categories.length > 0 ? categories[0].id : '');
  const [subType, setSubType] = useState('');
  const [md, setMd] = useState('');
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

  const weekStart = startOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });
  const currentMonth = getMonth(weekStart) + 1;
  const currentWeek = getWeekOfMonth(weekStart, { weekStartsOn: 1 });

  const myDailyReports = useMemo(() =>
    reports.filter(r => r.periodType === 'daily' && r.userId === currentUser?.id &&
      isWithinInterval(parseISO(r.date), { start: weekStart, end: weekEnd })),
    [reports, selectedDate, weekStart, weekEnd, currentUser?.id]);

  const myWeeklyPlans = useMemo(() =>
    reports.filter(r => r.periodType === 'weekly' && r.userId === currentUser?.id &&
      isWithinInterval(parseISO(r.date), { start: weekStart, end: weekEnd })),
    [reports, selectedDate, weekStart, weekEnd, currentUser?.id]);

  const combinedReports = useMemo(() => [
    ...myWeeklyPlans,
    ...myDailyReports.filter(r => r.type === 'done')
  ], [myWeeklyPlans, myDailyReports]);

  const handleAddPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    addReport({
      userId: currentUser.id,
      date: format(weekStart, 'yyyy-MM-dd'),
      category: buildCategory(),
      content,
      mh: Number(md) * 8,
      progress: Number(progress) || 0,
      type: 'todo',
      periodType: 'weekly',
      isPlanned
    });
    setContent('');
    setMd('');
    setProgress('');
  };

  return (
    <div className="weekly-report-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>주간 단위 실적 및 계획</h2>
        <div style={{ fontSize: '0.82rem' }}>
          <Input type="date" label="" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        </div>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        조회 기간: {format(weekStart, 'yyyy-MM-dd')} ~ {format(weekEnd, 'yyyy-MM-dd')}
      </p>

      <Card title={`${currentMonth}월 ${currentWeek}주차 전체 현황`} className="mb-4">
        <ReportSplitView reports={combinedReports} doneReadOnly={true} />
      </Card>

      <Card title={`${currentMonth}월 ${currentWeek}주차 업무 계획 추가`} className="mb-4">
        <form onSubmit={handleAddPlan} className="report-form">
          {/* 1행: 유형 / 세부유형 / MD / 진행률 / 체크박스 / 버튼 */}
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
              <Input label="공수(MD)" type="number" min="0" step="0.5" value={md} onChange={e => setMd(e.target.value)} placeholder="0" required />
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
          {/* 2행: 업무 일감 내용 */}
          <Input
            label="업무 일감 내용"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="예: 요구사항 분석 및 WBS 작성, 설계 문서 초안 작성"
            required
          />
        </form>
      </Card>
    </div>
  );
};
