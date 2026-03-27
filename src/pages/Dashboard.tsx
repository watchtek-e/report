import { FormEvent, useState, useMemo } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { MultiUserSelect } from '../components/MultiUserSelect';
import { useReportStore } from '../store/reportStore';
import { useUserStore } from '../store/userStore';
import { useSystemStore } from '../store/systemStore';
import {
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import './Dashboard.css';

export const Dashboard = () => {
  const { reports } = useReportStore();
  const { currentUser, getAllUsers } = useUserStore();
  const { categories, holidays } = useSystemStore();
  
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null);

  const usersMap = useMemo(() => getAllUsers(), [getAllUsers]);

  const myReports = useMemo(() => {
    if (!currentUser?.id) return [];
    return reports.filter((report) => {
      const targets = report.assigneeIds && report.assigneeIds.length > 0 ? report.assigneeIds : [report.userId];
      return targets.includes(currentUser.id);
    });
  }, [reports, currentUser?.id]);

  const {
    dailyPrevDone,
    dailySelectedTodo,
    dailySelectedDone,
    weeklyPrevDone,
    weeklyCurrentTodo,
    weeklyCurrentDone,
    weeklyNextTodo,
    monthlyCurrentTodo,
    monthlyCurrentDone,
    monthlyNextTodo,
    yesterdayReports,
    currentWeekRange,
    prevWeekRange,
    nextWeekRange,
    currentMonthRange,
    nextMonthRange,
    previousDate,
  } = useMemo(() => {
    const selected = parseISO(selectedDate);
    const currentWeekStart = startOfWeek(selected, { weekStartsOn: 1 });
    const currentWeekEnd = endOfWeek(selected, { weekStartsOn: 1 });
    const prevWeekStart = startOfWeek(addWeeks(selected, -1), { weekStartsOn: 1 });
    const prevWeekEnd = endOfWeek(addWeeks(selected, -1), { weekStartsOn: 1 });
    const nextWeekStart = startOfWeek(addWeeks(selected, 1), { weekStartsOn: 1 });
    const nextWeekEnd = endOfWeek(addWeeks(selected, 1), { weekStartsOn: 1 });

    const currentMonthStart = startOfMonth(selected);
    const currentMonthEnd = endOfMonth(selected);
    const nextMonthStart = startOfMonth(addMonths(selected, 1));
    const nextMonthEnd = endOfMonth(addMonths(selected, 1));

    const previousDate = subDays(selected, 1);
    const previousDateStr = format(previousDate, 'yyyy-MM-dd');

    const dateInRange = (date: string, start: Date, end: Date) => isWithinInterval(parseISO(date), { start, end });

    return {
      dailyPrevDone: myReports.filter((r) => r.periodType === 'daily' && r.type === 'done' && r.date === previousDateStr),
      dailySelectedTodo: myReports.filter((r) => r.periodType === 'daily' && r.type === 'todo' && r.date === selectedDate),
      dailySelectedDone: myReports.filter((r) => r.periodType === 'daily' && r.type === 'done' && r.date === selectedDate),
      weeklyPrevDone: myReports.filter((r) => r.periodType === 'daily' && r.type === 'done' && dateInRange(r.date, prevWeekStart, prevWeekEnd)),
      weeklyCurrentTodo: myReports.filter((r) => r.periodType === 'weekly' && r.type === 'todo' && dateInRange(r.date, currentWeekStart, currentWeekEnd)),
      weeklyCurrentDone: myReports.filter((r) => r.periodType === 'daily' && r.type === 'done' && dateInRange(r.date, currentWeekStart, currentWeekEnd)),
      weeklyNextTodo: myReports.filter((r) => r.periodType === 'weekly' && r.type === 'todo' && dateInRange(r.date, nextWeekStart, nextWeekEnd)),
      monthlyCurrentTodo: myReports.filter((r) => r.periodType === 'monthly' && r.type === 'todo' && dateInRange(r.date, currentMonthStart, currentMonthEnd)),
      monthlyCurrentDone: myReports.filter((r) => r.periodType === 'daily' && r.type === 'done' && dateInRange(r.date, currentMonthStart, currentMonthEnd)),
      monthlyNextTodo: myReports.filter((r) => r.periodType === 'monthly' && r.type === 'todo' && dateInRange(r.date, nextMonthStart, nextMonthEnd)),
      yesterdayReports: myReports.filter((r) => r.periodType === 'daily' && r.type === 'done' && r.date === previousDateStr),
      currentWeekRange: { start: currentWeekStart, end: currentWeekEnd },
      prevWeekRange: { start: prevWeekStart, end: prevWeekEnd },
      nextWeekRange: { start: nextWeekStart, end: nextWeekEnd },
      currentMonthRange: { start: currentMonthStart, end: currentMonthEnd },
      nextMonthRange: { start: nextMonthStart, end: nextMonthEnd },
      previousDate,
    };
  }, [myReports, selectedDate]);

  // 어제 날짜 완료된 일간 보고서 없으면 경고
  const isYesterdayMissing = yesterdayReports.length === 0;

  const holidaySet = useMemo(() => new Set(holidays), [holidays]);

  const calculateWorkingMh = (start: Date, end: Date) => {
    const cursor = new Date(start);
    let workDays = 0;
    while (cursor <= end) {
      const dow = cursor.getDay();
      const dateStr = format(cursor, 'yyyy-MM-dd');
      if (dow !== 0 && dow !== 6 && !holidaySet.has(dateStr)) {
        workDays += 1;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return workDays * 8;
  };

  const calculateEnteredMh = (arr: { mh: number }[]) => arr.reduce((acc, report) => acc + report.mh, 0);

  const dailyPrevTotalMh = holidaySet.has(format(previousDate, 'yyyy-MM-dd')) || [0, 6].includes(previousDate.getDay()) ? 0 : 8;
  const dailySelectedDateObj = parseISO(selectedDate);
  const dailySelectedTotalMh = holidaySet.has(selectedDate) || [0, 6].includes(dailySelectedDateObj.getDay()) ? 0 : 8;

  const dashboardSections = [
    {
      title: '일간',
      periodType: 'daily' as const,
      rows: [
        {
          key: 'daily-prev-done',
          label: `${format(previousDate, 'MM월 dd일')} 결과 업무`,
          reports: dailyPrevDone,
          enteredMh: calculateEnteredMh(dailyPrevDone),
          totalMh: dailyPrevTotalMh,
          type: 'done' as const,
          date: format(previousDate, 'yyyy-MM-dd'),
        },
        {
          key: 'daily-current-todo',
          label: `${format(parseISO(selectedDate), 'MM월 dd일')} 계획 업무`,
          reports: dailySelectedTodo,
          enteredMh: calculateEnteredMh(dailySelectedTodo),
          totalMh: dailySelectedTotalMh,
          type: 'todo' as const,
          date: selectedDate,
        },
        {
          key: 'daily-current-done',
          label: `${format(parseISO(selectedDate), 'MM월 dd일')} 결과 업무`,
          reports: dailySelectedDone,
          enteredMh: calculateEnteredMh(dailySelectedDone),
          totalMh: dailySelectedTotalMh,
          type: 'done' as const,
          date: selectedDate,
        },
      ],
    },
    {
      title: '주간',
      periodType: 'weekly' as const,
      rows: [
        {
          key: 'weekly-prev-done',
          label: `${format(prevWeekRange.start, 'M월 d일')}~${format(prevWeekRange.end, 'M월 d일')} 결과 업무`,
          reports: weeklyPrevDone,
          enteredMh: calculateEnteredMh(weeklyPrevDone),
          totalMh: calculateWorkingMh(prevWeekRange.start, prevWeekRange.end),
          type: 'done' as const,
          date: format(prevWeekRange.start, 'yyyy-MM-dd'),
        },
        {
          key: 'weekly-current-todo',
          label: `${format(currentWeekRange.start, 'M월 d일')}~${format(currentWeekRange.end, 'M월 d일')} 계획 업무`,
          reports: weeklyCurrentTodo,
          enteredMh: calculateEnteredMh(weeklyCurrentTodo),
          totalMh: calculateWorkingMh(currentWeekRange.start, currentWeekRange.end),
          type: 'todo' as const,
          date: format(currentWeekRange.start, 'yyyy-MM-dd'),
        },
        {
          key: 'weekly-current-done',
          label: `${format(currentWeekRange.start, 'M월 d일')}~${format(currentWeekRange.end, 'M월 d일')} 결과 업무`,
          reports: weeklyCurrentDone,
          enteredMh: calculateEnteredMh(weeklyCurrentDone),
          totalMh: calculateWorkingMh(currentWeekRange.start, currentWeekRange.end),
          type: 'done' as const,
          date: format(currentWeekRange.start, 'yyyy-MM-dd'),
        },
        {
          key: 'weekly-next-todo',
          label: `${format(nextWeekRange.start, 'M월 d일')}~${format(nextWeekRange.end, 'M월 d일')} 계획 업무`,
          reports: weeklyNextTodo,
          enteredMh: calculateEnteredMh(weeklyNextTodo),
          totalMh: calculateWorkingMh(nextWeekRange.start, nextWeekRange.end),
          type: 'todo' as const,
          date: format(nextWeekRange.start, 'yyyy-MM-dd'),
        },
      ],
    },
    {
      title: '월간',
      periodType: 'monthly' as const,
      rows: [
        {
          key: 'monthly-current-todo',
          label: `${format(currentMonthRange.start, 'M월')} 계획 업무`,
          reports: monthlyCurrentTodo,
          enteredMh: calculateEnteredMh(monthlyCurrentTodo),
          totalMh: calculateWorkingMh(currentMonthRange.start, currentMonthRange.end),
          type: 'todo' as const,
          date: format(currentMonthRange.start, 'yyyy-MM-dd'),
        },
        {
          key: 'monthly-current-done',
          label: `${format(currentMonthRange.start, 'M월')} 결과 업무`,
          reports: monthlyCurrentDone,
          enteredMh: calculateEnteredMh(monthlyCurrentDone),
          totalMh: calculateWorkingMh(currentMonthRange.start, currentMonthRange.end),
          type: 'done' as const,
          date: format(currentMonthRange.start, 'yyyy-MM-dd'),
        },
        {
          key: 'monthly-next-todo',
          label: `${format(nextMonthRange.start, 'M월')} 계획 업무`,
          reports: monthlyNextTodo,
          enteredMh: calculateEnteredMh(monthlyNextTodo),
          totalMh: calculateWorkingMh(nextMonthRange.start, nextMonthRange.end),
          type: 'todo' as const,
          date: format(nextMonthRange.start, 'yyyy-MM-dd'),
        },
      ],
    },
  ];

  return (
    <div className="dashboard-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.3rem', margin: 0 }}>내 업무 현황</h2>
        <div style={{ width: '160px' }}>
          <Input 
            type="date" 
            label="" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
          />
        </div>
      </div>

      {isYesterdayMissing && (
        <Card className="alert-card mb-4" style={{borderLeft: '4px solid #ef4444'}}>
          <div className="alert-content">
            <AlertTriangle size={24} color="#ef4444" style={{ flexShrink: 0 }} />
            <div>
              <h3 className="alert-title">보고 누락 알림: 어제 치 완료 업무가 등록되지 않았습니다!</h3>
              <p className="alert-desc">일간 보고 메뉴에서 어제 일자의 달성 업무를 등록해 주세요.</p>
            </div>
          </div>
        </Card>
      )}

      <Card title={`${selectedDate} 입력 현황`} className="mb-4">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {dashboardSections.map((section) => (
            <div key={section.title}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: '#0f172a', fontWeight: 700 }}>
                [{section.title}]
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                {section.rows.map((row) => {
                  const isMdPeriod = section.periodType === 'weekly' || section.periodType === 'monthly';
                  const displayValue = isMdPeriod
                    ? `${(row.enteredMh / 8).toFixed(1)}MD / ${(row.totalMh / 8).toFixed(1)}MD`
                    : `${row.enteredMh.toFixed(1)}MH / ${row.totalMh.toFixed(1)}MH`;
                  
                  return (
                    <div key={row.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.5rem', lineHeight: '1.3' }}>
                        {row.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedBucket((prev) => (prev === row.key ? null : row.key))}
                        style={{
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#1d4ed8',
                          borderRadius: '6px',
                          padding: '0.5rem 0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          width: '100%',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLButtonElement).style.background = '#f0f9ff';
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLButtonElement).style.background = '#ffffff';
                        }}
                      >
                        {displayValue}
                      </button>
                    </div>
                  );
                })}
              </div>
              {(() => {
                const expandedRow = section.rows.find((row) => row.key === expandedBucket);
                if (!expandedRow) return null;

                return (
                  <div style={{ marginTop: '0.9rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.9rem', width: '100%' }}>
                    <DashboardInputForm
                      row={expandedRow}
                      section={section}
                      categories={categories}
                      teamAssigneeOptions={Object.values(usersMap)
                        .filter((u) => u && currentUser && u.department === currentUser.department)
                        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))}
                      currentUser={currentUser}
                      onSubmit={() => setExpandedBucket(null)}
                    />
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// Dashboard Input Form Component
interface DashboardInputFormProps {
  row: any;
  section: any;
  categories: any[];
  teamAssigneeOptions: any[];
  currentUser: any;
  onSubmit: () => void;
}

const DashboardInputForm = ({
  row,
  section,
  categories,
  teamAssigneeOptions,
  currentUser,
  onSubmit,
}: DashboardInputFormProps) => {
  const { reports, addReport } = useReportStore();
  const [mainType, setMainType] = useState(categories.length > 0 ? categories[0].id : '');
  const [subType, setSubType] = useState('');
  const [mh, setMh] = useState('');
  const [progress, setProgress] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>(currentUser ? [currentUser.id] : []);
  const [isPlanned, setIsPlanned] = useState(true);
  const [content, setContent] = useState('');
  const [planWeekdays, setPlanWeekdays] = useState<number[]>([]);
  const [planWeeks, setPlanWeeks] = useState<number[]>([]);

  const selectedMain = categories.find((c) => c.id === mainType);
  const subOptions = selectedMain?.subTypes ?? [];

  const isAssignedToMe = (report: { userId: string; assigneeIds?: string[] }) => {
    if (!currentUser?.id) return false;
    const targets = report.assigneeIds && report.assigneeIds.length > 0 ? report.assigneeIds : [report.userId];
    return targets.includes(currentUser.id);
  };

  const importOptions = useMemo(() => {
    if (!currentUser?.id) return [] as typeof reports;

    if (section.periodType === 'daily' && row.type === 'done') {
      return reports.filter((report) =>
        report.periodType === 'daily' &&
        report.type === 'todo' &&
        report.date === row.date &&
        isAssignedToMe(report),
      );
    }

    if (row.type === 'todo') {
      const baseDate = parseISO(row.date);
      const monthStart = startOfMonth(baseDate);
      const monthEnd = endOfMonth(baseDate);

      return reports.filter((report) =>
        report.periodType === 'monthly' &&
        report.type === 'todo' &&
        isWithinInterval(parseISO(report.date), { start: monthStart, end: monthEnd }) &&
        isAssignedToMe(report),
      );
    }

    if (section.periodType === 'weekly' && row.type === 'done') {
      const weekStart = startOfWeek(parseISO(row.date), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(parseISO(row.date), { weekStartsOn: 1 });

      return reports.filter((report) =>
        report.periodType === 'daily' &&
        report.type === 'done' &&
        isWithinInterval(parseISO(report.date), { start: weekStart, end: weekEnd }) &&
        isAssignedToMe(report),
      );
    }

    if (section.periodType === 'monthly' && row.type === 'done') {
      const monthStart = startOfMonth(parseISO(row.date));
      const monthEnd = endOfMonth(parseISO(row.date));

      return reports.filter((report) =>
        report.periodType === 'daily' &&
        report.type === 'done' &&
        isWithinInterval(parseISO(report.date), { start: monthStart, end: monthEnd }) &&
        isAssignedToMe(report),
      );
    }

    return [] as typeof reports;
  }, [reports, currentUser?.id, row.date, row.type, section.periodType]);

  const applyImportedTask = (taskId: string) => {
    const target = importOptions.find((task) => task.id === taskId);
    if (!target) return;

    const [mainName, subName] = target.category.split(' > ');
    const main = categories.find((category) => category.mainType === mainName);
    const sub = main?.subTypes.find((subTypeItem: any) => subTypeItem.name === subName);

    if (main) setMainType(main.id);
    setSubType(sub?.id ?? '');
    setContent(target.content);
    setProgress(String(target.progress));
    setMh(section.periodType === 'daily' ? String(target.mh) : String(target.mh / 8));
    setAssigneeIds(target.assigneeIds && target.assigneeIds.length > 0 ? target.assigneeIds : [target.userId]);
    setIsPlanned(target.isPlanned);
  };

  const handleMainChange = (val: string) => {
    setMainType(val);
    setSubType('');
  };

  const buildCategory = () => {
    const main = categories.find((c) => c.id === mainType)?.mainType ?? '기타';
    const sub = subOptions.find((s: any) => s.id === subType)?.name;
    return sub ? `${main} > ${sub}` : `${main} > 미지정`;
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const isMdPeriod = section.periodType === 'weekly' || section.periodType === 'monthly';
    const mhValue = isMdPeriod ? Number(mh) * 8 : Number(mh);

    addReport({
      userId: currentUser.id,
      date: row.date,
      category: buildCategory(),
      content,
      mh: mhValue,
      progress: Number(progress) || 0,
      type: row.type,
      periodType: section.periodType,
      assigneeIds: assigneeIds.length > 0 ? assigneeIds : [currentUser.id],
      isPlanned,
      ...(section.periodType === 'weekly' && { planWeekdays }),
      ...(section.periodType === 'monthly' && { planWeeks }),
    });

    onSubmit();
  };

  const WEEKDAY_OPTIONS = [
    { value: 1, label: '월' },
    { value: 2, label: '화' },
    { value: 3, label: '수' },
    { value: 4, label: '목' },
    { value: 5, label: '금' },
  ];

  return (
    <Card style={{ backgroundColor: row.type === 'todo' ? '#fefce8' : '#f0fdf4' }}>
      <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* 제목 */}
        <div style={{ marginBottom: '0.5rem' }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
            {row.type === 'todo' ? '📋 계획 업무 추가' : '✅ 결과 업무 추가'}
          </h4>
        </div>

        {/* 유형 / 세부유형 */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="ui-input-container" style={{ flex: '0 0 200px' }}>
            <label className="ui-input-label" style={{ fontSize: '0.78rem' }}>유형</label>
            <select className="ui-input" value={mainType} onChange={(e) => handleMainChange(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.mainType}
                </option>
              ))}
            </select>
          </div>
          <div className="ui-input-container" style={{ flex: '0 0 200px' }}>
            <label className="ui-input-label" style={{ fontSize: '0.78rem' }}>세부유형</label>
            <select className="ui-input" value={subType} onChange={(e) => setSubType(e.target.value)}>
              <option value="">미지정</option>
              {subOptions.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          {importOptions.length > 0 && (
            <div className="ui-input-container" style={{ flex: '1 1 260px', minWidth: '240px' }}>
              <label className="ui-input-label" style={{ fontSize: '0.78rem' }}>
                {section.periodType === 'daily' && row.type === 'done' ? '계획 업무에서 가져오기' : '업무 가져오기'}
              </label>
              <select
                className="ui-input"
                onChange={(e) => {
                  if (e.target.value) {
                    applyImportedTask(e.target.value);
                    e.target.value = '';
                  }
                }}
              >
                <option value="">선택하면 자동 입력됩니다</option>
                {importOptions.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.category} | {task.content}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 업무 내용 */}
        <Input
          label="업무 일감"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="업무 내용을 입력하세요"
          required
        />

        {/* 공수 / 진행률 */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 100px' }}>
            <Input
              label={section.periodType === 'daily' ? '공수(MH)' : '공수(MD)'}
              type="number"
              min="0"
              step="0.5"
              value={mh}
              onChange={(e) => setMh(e.target.value)}
              placeholder="0"
              required
            />
          </div>
          <div style={{ flex: '0 0 100px' }}>
            <Input
              label="진행률(%)"
              type="number"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(e.target.value)}
              placeholder="0"
              required
            />
          </div>
        </div>

        {/* 주간 - 수행 요일 선택 */}
        {section.periodType === 'weekly' && (
          <div>
            <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>수행 요일</label>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {WEEKDAY_OPTIONS.map((day) => (
                <label key={day.value} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={planWeekdays.includes(day.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPlanWeekdays((prev) => [...prev, day.value].sort((a, b) => a - b));
                      } else {
                        setPlanWeekdays((prev) => prev.filter((v) => v !== day.value));
                      }
                    }}
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* 월간 - 수행 주차 선택 */}
        {section.periodType === 'monthly' && (
          <div>
            <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>수행 주차</label>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {Array.from({ length: 5 }, (_, i) => i + 1).map((weekNo) => (
                <label key={weekNo} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={planWeeks.includes(weekNo)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPlanWeeks((prev) => [...prev, weekNo].sort((a, b) => a - b));
                      } else {
                        setPlanWeeks((prev) => prev.filter((v) => v !== weekNo));
                      }
                    }}
                  />
                  {weekNo}주차
                </label>
              ))}
            </div>
          </div>
        )}

        {/* 담당자 선택 */}
        <MultiUserSelect
          users={teamAssigneeOptions}
          selectedIds={assigneeIds}
          onChange={setAssigneeIds}
          label="담당자(다중선택)"
        />

        {/* 체크박스 + 버튼 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={isPlanned}
              onChange={(e) => setIsPlanned(e.target.checked)}
              style={{ width: '15px', height: '15px' }}
            />
            계획작업
          </label>
          <Button type="submit" size="sm" style={{ marginLeft: 'auto' }}>
            저장
          </Button>
        </div>
      </form>
    </Card>
  );
};
