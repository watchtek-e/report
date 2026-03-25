import { useMemo, useState } from 'react';
import { endOfMonth, endOfWeek, format, isWithinInterval, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { ReportSplitView } from '../components/ReportSplitView';
import { Report } from '../store/reportStore';
import { useReportStore } from '../store/reportStore';
import { useUserStore } from '../store/userStore';
import './ConsolidationCheck.css';

type ConsolidationTab = 'daily' | 'weekly' | 'monthly';
type GroupingMode = 'category' | 'user';

type ReportGroup = {
  key: string;
  label: string;
  reports: Report[];
};

const TAB_ITEMS: Array<{ key: ConsolidationTab; label: string }> = [
  { key: 'daily', label: '일간' },
  { key: 'weekly', label: '주간' },
  { key: 'monthly', label: '월간' },
];

const GROUPING_OPTIONS: Array<{ key: GroupingMode; label: string }> = [
  { key: 'category', label: '업무 유형별 확인' },
  { key: 'user', label: '개인별 확인' },
];

const toEffortText = (report: Report, tab: ConsolidationTab) => {
  const md = (report.mh / 8).toFixed(1);
  if (tab === 'daily') return `${report.mh}MH`;
  return `${md}MD`;
};

const buildCopyText = (title: string, reports: Report[], tab: ConsolidationTab) => {
  const todo = reports.filter((report) => report.type === 'todo');
  const done = reports.filter((report) => report.type === 'done');

  const todoLines = todo.length
    ? todo.map((report) => `- ${report.category} | ${report.content} | ${toEffortText(report, tab)} | 진행률 ${report.progress}%`)
    : ['- 없음'];

  const doneLines = done.length
    ? done.map((report) => `- ${report.category} | ${report.content} | ${toEffortText(report, tab)} | 진행률 ${report.progress}%`)
    : ['- 없음'];

  return [
    `[${title}]`,
    '진행할 업무',
    ...todoLines,
    '',
    '진행한 업무',
    ...doneLines,
  ].join('\n');
};

export const ConsolidationCheck = () => {
  const [activeTab, setActiveTab] = useState<ConsolidationTab>('daily');
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('category');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { reports } = useReportStore();
  const { currentUser, getAllUsers } = useUserStore();

  const selected = parseISO(selectedDate);
  const weekStart = startOfWeek(selected, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selected, { weekStartsOn: 1 });
  const monthStart = startOfMonth(selected);
  const monthEnd = endOfMonth(selected);

  const usersMap = useMemo(() => getAllUsers(), [getAllUsers]);

  const teamReports = useMemo(() => {
    if (!currentUser) return [];
    return reports.filter((report) => usersMap[report.userId]?.department === currentUser.department);
  }, [reports, usersMap, currentUser]);

  const scopedReports = useMemo(() => {
    if (activeTab === 'daily') {
      return teamReports.filter((report) => report.periodType === 'daily' && report.date === selectedDate);
    }

    if (activeTab === 'weekly') {
      return teamReports.filter((report) => {
        const reportDate = parseISO(report.date);
        return (
          (report.periodType === 'weekly' || report.periodType === 'daily') &&
          isWithinInterval(reportDate, { start: weekStart, end: weekEnd })
        );
      });
    }

    return teamReports.filter((report) => {
      const reportDate = parseISO(report.date);
      return (
        (report.periodType === 'monthly' || report.periodType === 'daily') &&
        isWithinInterval(reportDate, { start: monthStart, end: monthEnd })
      );
    });
  }, [activeTab, teamReports, selectedDate, weekStart, weekEnd, monthStart, monthEnd]);

  const groups = useMemo<ReportGroup[]>(() => {
    if (groupingMode === 'user') {
      const bucket = new Map<string, Report[]>();
      scopedReports.forEach((report) => {
        if (!bucket.has(report.userId)) bucket.set(report.userId, []);
        bucket.get(report.userId)?.push(report);
      });

      return Array.from(bucket.entries()).map(([userId, groupReports]) => ({
        key: userId,
        label: usersMap[userId]?.name ? `${usersMap[userId].name} (${userId})` : userId,
        reports: groupReports,
      }));
    }

    const bucket = new Map<string, Report[]>();
    scopedReports.forEach((report) => {
      const key = report.category.split(' > ')[0] || '기타';
      if (!bucket.has(key)) bucket.set(key, []);
      bucket.get(key)?.push(report);
    });

    return Array.from(bucket.entries()).map(([category, groupReports]) => ({
      key: category,
      label: category,
      reports: groupReports,
    }));
  }, [groupingMode, scopedReports, usersMap]);

  const titlePrefix =
    activeTab === 'daily'
      ? `일간 취합 확인 (${selectedDate})`
      : activeTab === 'weekly'
        ? `주간 취합 확인 (${format(weekStart, 'yyyy-MM-dd')} ~ ${format(weekEnd, 'yyyy-MM-dd')})`
        : `월간 취합 확인 (${format(monthStart, 'yyyy-MM')}월)`;

  const handleCopy = async (group: ReportGroup) => {
    const content = buildCopyText(`${titlePrefix} / ${group.label}`, group.reports, activeTab);
    try {
      await navigator.clipboard.writeText(content);
      alert('복사되었습니다. PPT에 바로 붙여넣기 할 수 있습니다.');
    } catch {
      alert('복사에 실패했습니다. 브라우저 권한을 확인해 주세요.');
    }
  };

  return (
    <div className="consolidation-page">
      <div className="consolidation-toolbar">
        <div className="consolidation-tabs" role="tablist" aria-label="취합 확인 탭">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`consolidation-tab ${activeTab === tab.key ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="consolidation-filters">
          <select
            className="consolidation-select"
            value={groupingMode}
            onChange={(event) => setGroupingMode(event.target.value as GroupingMode)}
          >
            {GROUPING_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>

          <div className="consolidation-date">
            <Input
              type={activeTab === 'monthly' ? 'month' : 'date'}
              label=""
              value={activeTab === 'monthly' ? selectedDate.slice(0, 7) : selectedDate}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedDate(activeTab === 'monthly' ? `${value}-01` : value);
              }}
            />
          </div>
        </div>
      </div>

      {groups.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: '#64748b' }}>조회 조건에 해당하는 취합 데이터가 없습니다.</p>
        </Card>
      ) : (
        groups.map((group) => (
          <Card key={group.key} className="consolidation-group-card">
            <div className="consolidation-group-header">
              <h3>{`${titlePrefix} - ${group.label}`}</h3>
              <button type="button" className="copy-btn" onClick={() => handleCopy(group)}>복사</button>
            </div>
            <ReportSplitView
              reports={group.reports}
              doneReadOnly={true}
              todoReadOnly={true}
              forceMdForDone={activeTab !== 'daily'}
              forceMdForTodo={activeTab !== 'daily'}
            />
          </Card>
        ))
      )}
    </div>
  );
};
