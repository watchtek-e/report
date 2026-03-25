import { FormEvent, useState, useMemo } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useReportStore } from '../store/reportStore';
import { useSystemStore } from '../store/systemStore';
import { useUserStore } from '../store/userStore';
import { ReportSplitView } from '../components/ReportSplitView';
import {
  format, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfWeek
} from 'date-fns';
import './WeeklyReport.css';

export const MonthlyReport = () => {
  const { reports, addReport } = useReportStore();
  const { categories, holidays } = useSystemStore();
  const { currentUser, getAllUsers } = useUserStore();
  const usersMap = useMemo(() => getAllUsers(), [getAllUsers]);

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [mainType, setMainType] = useState(categories.length > 0 ? categories[0].id : '');
  const [subType, setSubType] = useState('');
  const [md, setMd] = useState('');
  const [progress, setProgress] = useState('');
  const [isPlanned, setIsPlanned] = useState(true);
  const [content, setContent] = useState('');
  const [isPlanCardOpen, setIsPlanCardOpen] = useState(false);

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

    // 월 시작일이 포함된 주의 월요일부터 순회
    const cur = startOfWeek(monthStartDate, { weekStartsOn: 1 });

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

    const cur = startOfWeek(monthStartDate, { weekStartsOn: 1 });

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

  // 팀장이면 현재 팀의 모든 사람, 아니면 자신만
  const scopedUserIds = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'team-lead') {
      return Object.values(getAllUsers())
        .filter(u => u.department === currentUser.department)
        .map(u => u.id);
    }
    return [currentUser.id];
  }, [currentUser, getAllUsers]);

  const myDailyReports = useMemo(() =>
    reports.filter(r => r.periodType === 'daily' && scopedUserIds.includes(r.userId) &&
      isWithinInterval(parseISO(r.date), { start: monthStart, end: monthEnd })),
    [reports, selectedDate, monthStart, monthEnd, scopedUserIds]);

  const myMonthlyPlans = useMemo(() =>
    reports.filter(r => r.periodType === 'monthly' && scopedUserIds.includes(r.userId) &&
      isWithinInterval(parseISO(r.date), { start: monthStart, end: monthEnd })),
    [reports, selectedDate, monthStart, monthEnd, scopedUserIds]);

  // 현재 사용자의 월간 계획만 폼에서 가져오기용
  const monthlyPlanOptions = useMemo(() =>
    reports.filter(r =>
      r.userId === currentUser?.id &&
      r.periodType === 'monthly' &&
      r.type === 'todo' &&
      isWithinInterval(parseISO(r.date), { start: monthStart, end: monthEnd })
    ),
    [reports, currentUser?.id, monthStart, monthEnd]
  );

  const applyMonthlyPlan = (planId: string) => {
    const target = monthlyPlanOptions.find((plan) => plan.id === planId);
    if (!target) return;

    const [mainName, subName] = target.category.split(' > ');
    const main = categories.find((category) => category.mainType === mainName);
    const sub = main?.subTypes.find((subTypeItem) => subTypeItem.name === subName);

    if (main) setMainType(main.id);
    setSubType(sub?.id ?? '');
    setContent(target.content);
  };

  const combinedReports = useMemo(() => [
    ...myMonthlyPlans,
    ...myDailyReports.filter(r => r.type === 'done')
  ], [myMonthlyPlans, myDailyReports]);

  const todoEnteredMd = combinedReports.filter((report) => report.type === 'todo').reduce((acc, report) => acc + report.mh / 8, 0);
  const doneEnteredMd = combinedReports.filter((report) => report.type === 'done').reduce((acc, report) => acc + report.mh / 8, 0);

  const monthlyTotalMd = useMemo(() => {
    const holidaySet = new Set(holidays);
    const cursor = parseISO(workingRange.start);
    const end = parseISO(workingRange.end);
    let workingDays = 0;

    while (cursor <= end) {
      const dayOfWeek = cursor.getDay();
      const dateStr = format(cursor, 'yyyy-MM-dd');
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
        workingDays += 1;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return workingDays;
  }, [holidays, workingRange.end, workingRange.start]);

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
        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>월간 보고</h2>
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

      <Card title="" className="mb-4">
        <button
          type="button"
          onClick={() => setIsPlanCardOpen((prev) => !prev)}
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: isPlanCardOpen ? '1rem' : 0,
            border: 'none',
            background: 'transparent',
            padding: 0,
            cursor: 'pointer',
            borderBottom: '1px solid #e5e7eb',
            paddingBottom: '0.6rem',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{currentMonth}월 업무 계획 추가</h3>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{isPlanCardOpen ? '접기' : '펼치기'}</span>
        </button>

        {isPlanCardOpen && (
        <form onSubmit={handleAddPlan} className="report-form">
          {/* 0행: 월간 계획에서 가져오기 */}
          {monthlyPlanOptions.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div className="ui-input-container" style={{ flex: '0 0 100%' }}>
                <label className="ui-input-label" style={{ fontSize: '0.78rem' }}>📋 월간 계획에서 가져오기</label>
                <select
                  className="ui-input"
                  onChange={(e) => {
                    if (e.target.value) {
                      const plan = monthlyPlanOptions.find(p => p.id === e.target.value);
                      if (plan) applyMonthlyPlan(plan.id);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">선택하면 자동 입력됩니다</option>
                  {monthlyPlanOptions.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.category} | {plan.content} ({(plan.mh / 8).toFixed(1)}MD)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
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
        )}
      </Card>

      <Card title={`${currentMonth}월 전체 현황`} className="mb-4">
        <ReportSplitView
          reports={combinedReports}
          doneReadOnly={true}
          forceMdForDone={true}
          todoSummaryText={`(입력공수 ${todoEnteredMd.toFixed(1)}MD / 총 공수 ${monthlyTotalMd.toFixed(1)}MD)`}
          doneSummaryText={`(입력공수 ${doneEnteredMd.toFixed(1)}MD / 총 공수 ${monthlyTotalMd.toFixed(1)}MD)`}
          usersMap={usersMap}
        />
      </Card>
    </div>
  );
};
