import { FormEvent, useState, useMemo } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useReportStore } from '../store/reportStore';
import { useSystemStore } from '../store/systemStore';
import { useUserStore } from '../store/userStore';
import { ReportSplitView } from '../components/ReportSplitView';
import { addDays, endOfMonth, format, startOfMonth, startOfWeek, endOfWeek, isWithinInterval, parseISO, getMonth } from 'date-fns';
import './WeeklyReport.css';

const WEEKDAY_OPTIONS = [
  { value: 1, label: '월' },
  { value: 2, label: '화' },
  { value: 3, label: '수' },
  { value: 4, label: '목' },
  { value: 5, label: '금' },
];

export const WeeklyReport = () => {
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
  const [planWeekdays, setPlanWeekdays] = useState<number[]>([]);

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
  // 월 경계 주차는 ISO 관례에 맞춰 "해당 주의 목요일이 속한 달" 기준으로 표기한다.
  const weekAnchor = addDays(weekStart, 3);
  const currentMonth = getMonth(weekAnchor) + 1;

  const getMonthWeekByThursdayRule = (anchorDate: Date) => {
    const targetMonth = anchorDate.getMonth();
    const monthStart = startOfMonth(anchorDate);
    const monthEnd = endOfMonth(anchorDate);
    const firstWeekStart = startOfWeek(monthStart, { weekStartsOn: 1 });

    const cur = new Date(firstWeekStart);
    let weekNumber = 0;

    while (cur <= monthEnd) {
      const thursday = addDays(cur, 3);
      if (thursday.getMonth() === targetMonth) {
        weekNumber += 1;
        if (cur.getTime() === weekStart.getTime()) {
          return weekNumber;
        }
      }
      cur.setDate(cur.getDate() + 7);
    }

    return weekNumber;
  };

  const currentWeek = getMonthWeekByThursdayRule(weekAnchor);

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
      isWithinInterval(parseISO(r.date), { start: weekStart, end: weekEnd })),
    [reports, selectedDate, weekStart, weekEnd, scopedUserIds]);

  const myWeeklyPlans = useMemo(() =>
    reports.filter(r => r.periodType === 'weekly' && scopedUserIds.includes(r.userId) &&
      isWithinInterval(parseISO(r.date), { start: weekStart, end: weekEnd })),
    [reports, selectedDate, weekStart, weekEnd, scopedUserIds]);

  const monthlyPlanOptions = useMemo(() =>
    reports.filter((report) => {
      if (report.userId !== currentUser?.id) return false;
      if (report.periodType !== 'monthly' || report.type !== 'todo') return false;

      const reportDate = parseISO(report.date);
      return isWithinInterval(reportDate, {
        start: startOfMonth(weekAnchor),
        end: endOfMonth(weekAnchor),
      });
    }),
    [reports, currentUser?.id, weekAnchor],
  );

  const combinedReports = useMemo(() => [
    ...myWeeklyPlans,
    ...myDailyReports.filter(r => r.type === 'done')
  ], [myWeeklyPlans, myDailyReports]);

  const todoEnteredMd = combinedReports
    .filter((report) => report.type === 'todo')
    .reduce((acc, report) => acc + report.mh / 8, 0);
  const doneEnteredMd = combinedReports
    .filter((report) => report.type === 'done')
    .reduce((acc, report) => acc + report.mh / 8, 0);

  const weeklyTotalMd = useMemo(() => {
    const holidaySet = new Set(holidays);
    const cursor = new Date(weekStart);
    let workingDays = 0;

    while (cursor <= weekEnd) {
      const dayOfWeek = cursor.getDay();
      const dateStr = format(cursor, 'yyyy-MM-dd');
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
        workingDays += 1;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return workingDays;
  }, [holidays, weekStart, weekEnd]);

  const handleAddPlan = (e: FormEvent) => {
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
      planWeekdays,
      isPlanned
    });
    setContent('');
    setMd('');
    setProgress('');
    setPlanWeekdays([]);
  };

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

  return (
    <div className="weekly-report-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>주간 보고</h2>
        <div style={{ fontSize: '0.82rem' }}>
          <Input
            type="date"
            label=""
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        조회 기간: {format(weekStart, 'yyyy-MM-dd')} ~ {format(weekEnd, 'yyyy-MM-dd')}
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
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{currentMonth}월 {currentWeek}주차 업무 계획 추가</h3>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{isPlanCardOpen ? '접기' : '펼치기'}</span>
        </button>

        {isPlanCardOpen && (
        <form onSubmit={handleAddPlan} className="report-form">
          {/* 0행: 월간 계획 가져오기 */}
          {monthlyPlanOptions.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div className="ui-input-container" style={{ flex: '0 0 100%' }}>
                <label className="ui-input-label" style={{ fontSize: '0.78rem' }}>📋 월간 계획 가져오기</label>
                <select
                  className="ui-input"
                  onChange={(e) => {
                    if (e.target.value) {
                      applyMonthlyPlan(e.target.value);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">선택하면 자동 입력됩니다</option>
                  {monthlyPlanOptions.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.category} | {plan.content}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div style={{ marginBottom: '0.75rem' }}>
            <label className="ui-input-label" style={{ fontSize: '0.78rem', display: 'block', marginBottom: '0.35rem' }}>수행 요일</label>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {WEEKDAY_OPTIONS.map((day) => (
                <label key={day.value} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={planWeekdays.includes(day.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPlanWeekdays((prev) => [...prev, day.value].sort((a, b) => a - b));
                      } else {
                        setPlanWeekdays((prev) => prev.filter((value) => value !== day.value));
                      }
                    }}
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </div>
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
        )}
      </Card>

      <Card title={`${currentMonth}월 ${currentWeek}주차 전체 현황`} className="mb-4">
        <ReportSplitView
          reports={combinedReports}
          doneReadOnly={true}
          forceMdForDone={true}
          todoSummaryText={`(입력공수 ${todoEnteredMd.toFixed(1)}MD / 총 공수 ${weeklyTotalMd.toFixed(1)}MD)`}
          doneSummaryText={`(입력공수 ${doneEnteredMd.toFixed(1)}MD / 총 공수 ${weeklyTotalMd.toFixed(1)}MD)`}
          usersMap={usersMap}
        />
      </Card>
    </div>
  );
};
