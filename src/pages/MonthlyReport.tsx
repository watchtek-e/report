import { FormEvent, useState, useMemo } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useReportStore } from '../store/reportStore';
import { useSystemStore } from '../store/systemStore';
import { useUserStore } from '../store/userStore';
import { ReportSplitView } from '../components/ReportSplitView';
import {
  format, startOfMonth, endOfMonth, isWithinInterval, parseISO
} from 'date-fns';
import './WeeklyReport.css';

export const MonthlyReport = () => {
  const { reports, addReport } = useReportStore();
  const { categories, holidays } = useSystemStore();
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

  const monthStart = startOfMonth(parseISO(selectedDate));
  const monthEnd = endOfMonth(parseISO(selectedDate));
  const currentMonth = monthStart.getMonth() + 1;

  // 워킹데이: 목요일이 해당 월에 속하는 주차 수 × 5일 - 공휴일 (ISO 주차 기준)
  const workingDaysCount = useMemo(() => {
    const monthStartDate = startOfMonth(parseISO(selectedDate));
    const monthEndDate = endOfMonth(parseISO(selectedDate));
    let weekCount = 0;

    // 해당 월의 모든 월요일 순회
    const cur = new Date(monthStartDate);
    // 첫 번째 월요일 찾기
    while (cur.getDay() !== 1) { cur.setDate(cur.getDate() + 1); }

    while (cur <= monthEndDate) {
      // 해당 주의 목요일 (월요일 + 3일)
      const thursday = new Date(cur);
      thursday.setDate(thursday.getDate() + 3);
      // 목요일이 해당 월에 속하면 이 주는 해당 월의 주차
      if (thursday.getMonth() === monthStartDate.getMonth()) {
        weekCount++;
      }
      cur.setDate(cur.getDate() + 7);
    }

    // 주차 수 × 5일에서 해당 월 내 공휴일 (평일에 해당하는 것만) 차감
    let holidayCount = 0;
    holidays.forEach(hd => {
      const d = parseISO(hd);
      if (d >= monthStartDate && d <= monthEndDate) {
        const dow = d.getDay();
        if (dow !== 0 && dow !== 6) holidayCount++;
      }
    });

    return weekCount * 5 - holidayCount;
  }, [selectedDate, holidays]);

  // ISO 주차 기준 조회 기간: 첫 번째 유효 주의 월요일 ~ 마지막 유효 주의 금요일
  const workingRange = useMemo(() => {
    const monthStartDate = startOfMonth(parseISO(selectedDate));
    const monthEndDate = endOfMonth(parseISO(selectedDate));

    let firstMonday: Date | null = null;
    let lastFriday: Date | null = null;

    const cur = new Date(monthStartDate);
    while (cur.getDay() !== 1) { cur.setDate(cur.getDate() + 1); }

    while (cur <= monthEndDate) {
      const thursday = new Date(cur);
      thursday.setDate(thursday.getDate() + 3);
      if (thursday.getMonth() === monthStartDate.getMonth()) {
        if (!firstMonday) firstMonday = new Date(cur);
        const friday = new Date(cur);
        friday.setDate(friday.getDate() + 4);
        lastFriday = friday;
      }
      cur.setDate(cur.getDate() + 7);
    }

    return {
      start: firstMonday ? format(firstMonday, 'yyyy-MM-dd') : format(monthStartDate, 'yyyy-MM-dd'),
      end: lastFriday ? format(lastFriday, 'yyyy-MM-dd') : format(monthEndDate, 'yyyy-MM-dd'),
    };
  }, [selectedDate]);

  const myDailyReports = useMemo(() =>
    reports.filter(r => r.periodType === 'daily' && r.userId === currentUser?.id &&
      isWithinInterval(parseISO(r.date), { start: monthStart, end: monthEnd })),
    [reports, selectedDate, monthStart, monthEnd, currentUser?.id]);

  const myMonthlyPlans = useMemo(() =>
    reports.filter(r => r.periodType === 'monthly' && r.userId === currentUser?.id &&
      isWithinInterval(parseISO(r.date), { start: monthStart, end: monthEnd })),
    [reports, selectedDate, monthStart, monthEnd, currentUser?.id]);

  const totalPlannedMd = myMonthlyPlans.reduce((acc, r) => acc + (r.mh / 8), 0).toFixed(1);

  const combinedReports = useMemo(() => [
    ...myMonthlyPlans,
    ...myDailyReports.filter(r => r.type === 'done')
  ], [myMonthlyPlans, myDailyReports]);

  const handleAddPlan = (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    addReport({
      userId: currentUser.id,
      date: format(monthStart, 'yyyy-MM-dd'),
      category: buildCategory(),
      content,
      mh: Number(md) * 8,
      progress: Number(progress) || 0,
      type: 'todo',
      periodType: 'monthly',
      isPlanned
    });
    setContent('');
    setMd('');
    setProgress('');
  };

  return (
    <div className="weekly-report-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>월간 실적 및 업무 계획</h2>
        <div style={{ fontSize: '0.82rem' }}>
          <Input
            type="month"
            label=""
            value={selectedDate.substring(0, 7)}
            onChange={e => setSelectedDate(`${e.target.value}-01`)}
          />
        </div>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <span>조회 기간: {workingRange.start} ~ {workingRange.end}</span>
        <span style={{ backgroundColor: '#f0fdf4', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 'bold' }}>
          워킹데이 (주차 기준): {workingDaysCount} MD
        </span>
      </p>

      <Card title={`${currentMonth}월 전체 현황`} className="mb-4">
        <ReportSplitView reports={combinedReports} doneReadOnly={true} />
      </Card>

      <Card title="" className="mb-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.6rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{currentMonth}월 업무 계획 추가</h3>
          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#4f46e5' }}>
            계획 공수 합계: {totalPlannedMd} MD / {workingDaysCount} MD
          </span>
        </div>

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
            placeholder="예: 주요 서비스 요구사항 정의 및 설계 완수"
            required
          />
        </form>
      </Card>
    </div>
  );
};
