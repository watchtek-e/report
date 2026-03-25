import { useState, useMemo } from 'react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { useReportStore } from '../store/reportStore';
import { useUserStore } from '../store/userStore';
import { ReportSplitView } from '../components/ReportSplitView';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, subDays } from 'date-fns';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import './Dashboard.css';

export const Dashboard = () => {
  const { reports } = useReportStore();
  const { currentUser } = useUserStore();
  
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const myReports = useMemo(() => reports.filter(r => r.userId === currentUser?.id), [reports, currentUser]);

  const { dailyReports, weeklyReports, monthlyReports, yesterdayReports, weekReportsForStat, monthReportsForStat } = useMemo(() => {
    const selected = parseISO(selectedDate);
    const wStart = startOfWeek(selected, { weekStartsOn: 1 });
    const wEnd = endOfWeek(selected, { weekStartsOn: 1 });
    const mStart = startOfMonth(selected);
    const mEnd = endOfMonth(selected);

    const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    return {
      dailyReports: myReports.filter(r => r.date === selectedDate && r.periodType === 'daily'),
      weeklyReports: [
        ...myReports.filter(r => r.periodType === 'weekly' && isWithinInterval(parseISO(r.date), { start: wStart, end: wEnd })),
        ...myReports.filter(r => r.periodType === 'daily' && r.type === 'done' && isWithinInterval(parseISO(r.date), { start: wStart, end: wEnd }))
      ],
      monthlyReports: [
        ...myReports.filter(r => r.periodType === 'monthly' && isWithinInterval(parseISO(r.date), { start: mStart, end: mEnd })),
        ...myReports.filter(r => r.periodType === 'daily' && r.type === 'done' && isWithinInterval(parseISO(r.date), { start: mStart, end: mEnd }))
      ],
      yesterdayReports: myReports.filter(r => r.date === yesterdayStr && r.periodType === 'daily'),
      weekReportsForStat: myReports.filter(r => 
        r.periodType === 'daily' && isWithinInterval(parseISO(r.date), { start: wStart, end: wEnd })
      ),
      monthReportsForStat: myReports.filter(r => 
        r.periodType === 'daily' && isWithinInterval(parseISO(r.date), { start: mStart, end: mEnd })
      )
    };
  }, [myReports, selectedDate]);

  // 어제 날짜 완료된 일간 보고서 없으면 경고
  const isYesterdayMissing = yesterdayReports.filter(r => r.type === 'done').length === 0;

  const calculateTotal = (arr: any[]) => {
    const mh = arr.filter(r => r.type === 'done').reduce((acc, r) => acc + r.mh, 0);
    return { mh, md: Number((mh / 8).toFixed(2)) };
  };

  const weekStat = calculateTotal(weekReportsForStat);
  const monthStat = calculateTotal(monthReportsForStat);

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

      <div className="dashboard-grid mb-4">
        <Card className="summary-card">
          <div className="summary-icon" style={{backgroundColor: '#e0e7ff'}}><CheckCircle size={32} color="#4f46e5" /></div>
          <div className="summary-info">
            <span className="summary-label">선택 주차 누적 공수</span>
            <strong className="summary-value">{weekStat.md} MD <small className="text-secondary">({weekStat.mh} MH)</small></strong>
          </div>
        </Card>

        <Card className="summary-card">
          <div className="summary-icon" style={{backgroundColor: '#dcfce7'}}><CheckCircle size={32} color="#16a34a" /></div>
          <div className="summary-info">
            <span className="summary-label">선택 월 누적 공수</span>
            <strong className="summary-value">{monthStat.md} MD <small className="text-secondary">({monthStat.mh} MH)</small></strong>
          </div>
        </Card>
      </div>

      <Card title={`일간 단위 현황 (${selectedDate})`} className="mb-4">
        <ReportSplitView reports={dailyReports} />
      </Card>

      <Card title={`주간 단위 현황 (${format(startOfWeek(parseISO(selectedDate), {weekStartsOn:1}), 'MM-dd')} ~ ${format(endOfWeek(parseISO(selectedDate), {weekStartsOn:1}), 'MM-dd')})`} className="mb-4">
        <ReportSplitView reports={weeklyReports} doneReadOnly={true} />
      </Card>

      <Card title={`월간 단위 현황 (${format(parseISO(selectedDate), 'yyyy년 MM월')})`} className="mb-4">
        <ReportSplitView reports={monthlyReports} doneReadOnly={true} />
      </Card>
    </div>
  );
};
