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

// Extract subtype from category string
const getSubType = (categoryStr: string) => {
  const parts = categoryStr.split(' > ');
  return parts[1] || '미지정';
};

// Helper to aggregate reports by content and type
interface AggregatedReport {
  content: string;
  category: string;
  todoMh: number;
  doneMh: number;
  todoProgress: number;
  doneProgress: number;
  todoCount: number;
  doneCount: number;
  users: string[];
  lastDoneDate?: string;
}

const buildDailyCopyText = (title: string, reports: Report[], usersMap: Record<string, any>) => {
  // Aggregate by content to combine same tasks from different users
  const aggregated = new Map<string, AggregatedReport>();
  
  reports.forEach((report) => {
    const userName = usersMap[report.userId]?.name || report.userId;
    const key = report.content;
    
    if (!aggregated.has(key)) {
      aggregated.set(key, {
        content: report.content,
        category: report.category,
        todoMh: 0,
        doneMh: 0,
        todoProgress: 0,
        doneProgress: 0,
        todoCount: 0,
        doneCount: 0,
        users: [],
      });
    }
    
    const agg = aggregated.get(key)!;
    if (!agg.users.includes(userName)) {
      agg.users.push(userName);
    }
    
    if (report.type === 'todo') {
      agg.todoMh += report.mh;
      agg.todoProgress = report.progress;
      agg.todoCount += 1;
    } else {
      agg.doneMh += report.mh;
      agg.doneCount += 1;
      // 가장 최신 날짜의 진행률 사용
      if (!agg.lastDoneDate || report.date > agg.lastDoneDate) {
        agg.lastDoneDate = report.date;
        agg.doneProgress = report.progress;
      }
    }
  });

  const lines: string[] = [];
  
  aggregated.forEach((agg) => {
    const mainType = agg.category.split(' > ')[0];
    const subType = getSubType(agg.category);
    const doneProgress = agg.doneCount > 0 ? agg.doneProgress : '-';
    const todoProgress = agg.todoCount > 0 ? agg.todoProgress : '-';
    const doneMh = agg.doneCount > 0 ? agg.doneMh.toFixed(1) : '-';
    const todoMh = agg.todoCount > 0 ? agg.todoMh.toFixed(1) : '-';
    
    // First line: Category + Status + Effort
    const statusLine = `[${mainType}]${subType !== '미지정' ? ` [${subType}]` : ''} (${doneMh}MH / ${doneProgress}% | ${todoMh}MH / 예상 ${todoProgress}%)`;
    lines.push(statusLine);
    
    // Second line: Ticket + Description + Users
    lines.push(` ${agg.content.padEnd(40)} ${agg.users.join(',')}`);
    lines.push('');
  });

  return [
    `[${title}]`,
    '',
    ...lines,
  ].join('\n');
};

const buildWeeklyCopyTextByTask = (title: string, reports: Report[], usersMap: Record<string, any>) => {
  // Aggregate by category > content for weekly by task
  const aggregated = new Map<string, AggregatedReport>();
  
  reports.forEach((report) => {
    const userName = usersMap[report.userId]?.name || report.userId;
    const key = `${report.category}|${report.content}`;
    
    if (!aggregated.has(key)) {
      aggregated.set(key, {
        content: report.content,
        category: report.category,
        todoMh: 0,
        doneMh: 0,
        todoProgress: 0,
        doneProgress: 0,
        todoCount: 0,
        doneCount: 0,
        users: [],
      });
    }
    
    const agg = aggregated.get(key)!;
    if (!agg.users.includes(userName)) {
      agg.users.push(userName);
    }
    
    if (report.type === 'todo') {
      agg.todoMh += report.mh;
      agg.todoProgress = report.progress;
      agg.todoCount += 1;
    } else {
      agg.doneMh += report.mh;
      agg.doneCount += 1;
      // 가장 최신 날짜의 진행률 사용
      if (!agg.lastDoneDate || report.date > agg.lastDoneDate) {
        agg.lastDoneDate = report.date;
        agg.doneProgress = report.progress;
      }
    }
  });

  // Group by category
  const byCategory = new Map<string, AggregatedReport[]>();
  aggregated.forEach((agg) => {
    const categoryKey = agg.category.split(' > ')[0] || '기타';
    if (!byCategory.has(categoryKey)) {
      byCategory.set(categoryKey, []);
    }
    byCategory.get(categoryKey)!.push(agg);
  });

  const lines: string[] = [];
  
  // Add tasks grouped by category
  byCategory.forEach((tasks) => {
    tasks.forEach((agg) => {
      const mainType = agg.category.split(' > ')[0];
      const subType = getSubType(agg.category);
      const doneProgress = agg.doneCount > 0 ? agg.doneProgress : '-';
      const todoProgress = agg.todoCount > 0 ? agg.todoProgress : '-';
      const doneMd = agg.doneCount > 0 ? (agg.doneMh / 8).toFixed(1) : '-';
      const todoMd = agg.todoCount > 0 ? (agg.todoMh / 8).toFixed(1) : '-';
      
      // First line: Category + Status + Effort in MD
      const statusLine = `[${mainType}]${subType !== '미지정' ? ` [${subType}]` : ''} (${doneMd}MD / ${doneProgress}% | ${todoMd}MD / 예상 ${todoProgress}%)`;
      lines.push(statusLine);
      
      // Second line: Ticket + Description + Users
      lines.push(` ${agg.content.padEnd(40)} ${agg.users.join(',')}`);
      lines.push('');
    });
  });

  return [
    `[${title}]`,
    '',
    ...lines,
  ].join('\n');
};

const buildWeeklyCopyTextByPerson = (title: string, reports: Report[], usersMap: Record<string, any>) => {
  // Group by user > category > content
  const byUser = new Map<string, Report[]>();
  
  reports.forEach((report) => {
    if (!byUser.has(report.userId)) {
      byUser.set(report.userId, []);
    }
    byUser.get(report.userId)!.push(report);
  });

  const lines: string[] = [];
  
  byUser.forEach((userReports, userId) => {
    const userName = usersMap[userId]?.name || userId;
    
    // Aggregate by content for this user
    const aggregated = new Map<string, AggregatedReport>();
    userReports.forEach((report) => {
      const key = report.content;
      if (!aggregated.has(key)) {
        aggregated.set(key, {
          content: report.content,
          category: report.category,
          todoMh: 0,
          doneMh: 0,
          todoProgress: 0,
          doneProgress: 0,
          todoCount: 0,
          doneCount: 0,
          users: [userName],
        });
      }
      
      const agg = aggregated.get(key)!;
      if (report.type === 'todo') {
        agg.todoMh += report.mh;
        agg.todoProgress = report.progress;
        agg.todoCount += 1;
      } else {
        agg.doneMh += report.mh;
        agg.doneCount += 1;
        // 가장 최신 날짜의 진행률 사용
        if (!agg.lastDoneDate || report.date > agg.lastDoneDate) {
          agg.lastDoneDate = report.date;
          agg.doneProgress = report.progress;
        }
      }
    });
    
    aggregated.forEach((agg) => {
      const mainType = agg.category.split(' > ')[0];
      const subType = getSubType(agg.category);
      const doneProgress = agg.doneCount > 0 ? agg.doneProgress : '-';
      const todoProgress = agg.todoCount > 0 ? agg.todoProgress : '-';
      const doneResource = agg.doneCount > 0 ? (agg.doneMh / 8).toFixed(1) : '-';
      const todoResource = agg.todoCount > 0 ? (agg.todoMh / 8).toFixed(1) : '-';
      
      // First line: User + Category + Effort
      const statusLine = `[${userName}] [${mainType}]${subType !== '미지정' ? ` [${subType}]` : ''} (${doneResource}MD / ${doneProgress}% | ${todoResource}MD / 예상 ${todoProgress}%)`;
      lines.push(statusLine);
      
      // Second line: Ticket + Description
      lines.push(` ${agg.content}`);
      lines.push('');
    });
  });

  return [
    `[${title}]`,
    '',
    ...lines,
  ].join('\n');
};

const buildCopyText = (title: string, reports: Report[], tab: ConsolidationTab, groupingMode: GroupingMode, usersMap: Record<string, any>) => {
  if (tab === 'daily') {
    return buildDailyCopyText(title, reports, usersMap);
  }
  if (tab === 'weekly' && groupingMode === 'category') {
    return buildWeeklyCopyTextByTask(title, reports, usersMap);
  }
  if (tab === 'weekly' && groupingMode === 'user') {
    return buildWeeklyCopyTextByPerson(title, reports, usersMap);
  }
  
  // Default for monthly (same as weekly by task for now)
  return buildWeeklyCopyTextByTask(title, reports, usersMap);
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

  // 취합확인에서는 팀장/팀원 모두 팀 전체를 봄
  const teamReports = useMemo(() => {
    if (!currentUser) return [];
    return reports.filter((report) => usersMap[report.userId]?.department === currentUser.department);
  }, [reports, usersMap, currentUser]);

  const scopedReports = useMemo(() => {
    if (activeTab === 'daily') {
      return teamReports.filter((report) => report.periodType === 'daily' && report.date === selectedDate);
    }

    if (activeTab === 'weekly') {
      // 계획은 주간만, 결과는 주간 + 일간(done만)
      return teamReports.filter((report) => {
        const reportDate = parseISO(report.date);
        const inRange = isWithinInterval(reportDate, { start: weekStart, end: weekEnd });
        if (!inRange) return false;
        
        // 계획(todo)은 주간만 포함
        if (report.type === 'todo') {
          return report.periodType === 'weekly';
        }
        // 결과(done)는 주간 + 일간 포함
        return report.periodType === 'weekly' || report.periodType === 'daily';
      });
    }

    // Monthly tab: 계획은 월간만, 결과는 월간 + 일간(done만)
    return teamReports.filter((report) => {
      const reportDate = parseISO(report.date);
      const inRange = isWithinInterval(reportDate, { start: monthStart, end: monthEnd });
      if (!inRange) return false;
      
      // 계획(todo)은 월간만 포함
      if (report.type === 'todo') {
        return report.periodType === 'monthly';
      }
      // 결과(done)는 월간 + 일간 포함
      return report.periodType === 'monthly' || report.periodType === 'daily';
    });
  }, [activeTab, teamReports, selectedDate, weekStart, weekEnd, monthStart, monthEnd]);

  const groups = useMemo<ReportGroup[]>(() => {
    // For daily tab, group by task type (category)
    if (activeTab === 'daily') {
      const bucket = new Map<string, Report[]>();
      scopedReports.forEach((report) => {
        const key = report.category.split(' > ')[0] || '기타';
        if (!bucket.has(key)) bucket.set(key, []);
        bucket.get(key)?.push(report);
      });

      return Array.from(bucket.entries()).map(([categoryType, groupReports]) => ({
        key: categoryType,
        label: categoryType,
        reports: groupReports,
      }));
    }

    // For weekly/monthly tabs, use grouping mode selector
    if (groupingMode === 'user') {
      const bucket = new Map<string, Report[]>();
      scopedReports.forEach((report) => {
        if (!bucket.has(report.userId)) bucket.set(report.userId, []);
        bucket.get(report.userId)?.push(report);
      });

      return Array.from(bucket.entries()).map(([userId, groupReports]) => ({
        key: userId,
        label: usersMap[userId]?.name || userId, // Remove (userId) part
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
  }, [groupingMode, scopedReports, usersMap, activeTab]);

  const titlePrefix =
    activeTab === 'daily'
      ? `일간 취합 확인 (${selectedDate})`
      : activeTab === 'weekly'
        ? `주간 취합 확인 (${format(weekStart, 'yyyy-MM-dd')} ~ ${format(weekEnd, 'yyyy-MM-dd')})`
        : `월간 취합 확인 (${format(monthStart, 'yyyy-MM')}월)`;

  const handleCopy = async (group: ReportGroup) => {
    const content = buildCopyText(titlePrefix, group.reports, activeTab, groupingMode, usersMap);
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
          {activeTab !== 'daily' && (
            <select
              className="consolidation-select"
              value={groupingMode}
              onChange={(event) => setGroupingMode(event.target.value as GroupingMode)}
            >
              {GROUPING_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
            </select>
          )}

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
              <h3>{group.label}</h3>
              <button type="button" className="copy-btn" onClick={() => handleCopy(group)}>복사</button>
            </div>
            <ReportSplitView
              reports={group.reports}
              doneReadOnly={true}
              todoReadOnly={true}
              forceMdForDone={activeTab !== 'daily'}
              usersMap={usersMap}
            />
          </Card>
        ))
      )}
    </div>
  );
};
