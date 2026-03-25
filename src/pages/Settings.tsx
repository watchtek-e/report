import { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useUserStore } from '../store/userStore';
import { useSystemStore } from '../store/systemStore';
import './Settings.css';

export const Settings = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'category' | 'holiday' | 'alarm'>('profile');
  
  return (
    <div className="settings-page">
      <div className="settings-tabs">
        <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>내 정보 관리</button>
        <button className={activeTab === 'category' ? 'active' : ''} onClick={() => setActiveTab('category')}>업무 분류 관리</button>
        <button className={activeTab === 'holiday' ? 'active' : ''} onClick={() => setActiveTab('holiday')}>공휴일 설정</button>
        <button className={activeTab === 'alarm' ? 'active' : ''} onClick={() => setActiveTab('alarm')}>알람 설정</button>
      </div>
      <div className="settings-content">
        {activeTab === 'profile' && <ProfileSettings />}
        {activeTab === 'category' && <CategorySettings />}
        {activeTab === 'holiday' && <HolidaySettings />}
        {activeTab === 'alarm' && <AlarmSettings />}
      </div>
    </div>
  );
};

const ProfileSettings = () => {
  const { currentUser, updateProfile } = useUserStore();
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    department: currentUser?.department || '',
    part: currentUser?.part || '',
    position: currentUser?.position || '',
  });

  const handleSave = () => {
    updateProfile(formData);
    alert('저장되었습니다.');
  };

  return (
    <Card title="내 직급 등 정보 수정" className="p-4-settings">
      <div className="form-group-list">
        <Input label="이름" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        <Input label="소속명(팀)" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
        <Input label="파트 (선택)" value={formData.part} onChange={e => setFormData({...formData, part: e.target.value})} />
        <Input label="직급" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} />
        <div className="mt-4">
          <Button onClick={handleSave}>내 정보 저장하기</Button>
        </div>
      </div>
    </Card>
  );
};

const CategorySettings = () => {
  const {
    categories,
    addCategory,
    updateCategory,
    duplicateCategory,
    reorderCategory,
    removeCategory,
    addSubCategory,
    updateSubCategory,
    reorderSubCategory,
    removeSubCategory,
  } = useSystemStore();
  const [newMain, setNewMain] = useState('');
  const [newSub, setNewSub] = useState('');
  const [selectedMainId, setSelectedMainId] = useState<string | null>(null);
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null);
  const [draggingSubId, setDraggingSubId] = useState<string | null>(null);

  const selectedCategory = categories.find(c => c.id === selectedMainId);

  const handleEditCategory = async (categoryId: string, prevName: string) => {
    const nextName = prompt('유형명을 수정해 주세요.', prevName);
    if (!nextName) return;

    const trimmed = nextName.trim();
    if (!trimmed) return;

    await updateCategory(categoryId, trimmed);
  };

  const handleEditSubCategory = async (categoryId: string, subId: string, prevName: string) => {
    const nextName = prompt('상세유형명을 수정해 주세요.', prevName);
    if (!nextName) return;

    const trimmed = nextName.trim();
    if (!trimmed) return;

    await updateSubCategory(categoryId, subId, trimmed);
  };

  return (
    <Card title="유형 관리" className="p-4-settings">
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        {/* 대분류 구간 */}
        <div style={{ flex: 1, minWidth: '250px', borderRight: '1px solid var(--border-color)', paddingRight: '2rem' }}>
          <h4 style={{marginTop: 0}}>유형 (대분류)</h4>
          <p style={{ marginTop: 0, marginBottom: '0.6rem', fontSize: '0.8rem', color: '#64748b' }}>드래그해서 순서를 변경할 수 있습니다.</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0' }}>
            {categories.map((c) => (
              <li 
                key={c.id} 
                style={{ 
                  display: 'flex', justifyContent: 'space-between', padding: '0.6rem', 
                  border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '0.5rem',
                  backgroundColor: draggingCategoryId === c.id ? '#dbeafe' : c.id === selectedMainId ? '#eff6ff' : 'transparent',
                  cursor: 'pointer', borderColor: c.id === selectedMainId ? '#3b82f6' : 'var(--border-color)'
                }}
                draggable
                onClick={() => setSelectedMainId(c.id)}
                onDragStart={() => setDraggingCategoryId(c.id)}
                onDragEnd={() => setDraggingCategoryId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault();
                  if (!draggingCategoryId || draggingCategoryId === c.id) return;
                  await reorderCategory(draggingCategoryId, c.id);
                  setDraggingCategoryId(null);
                }}
              >
                <div style={{fontWeight: c.id === selectedMainId ? 600 : 400, color: c.id === selectedMainId ? '#1d4ed8' : 'inherit'}}>{c.mainType}</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditCategory(c.id, c.mainType);
                    }}
                    style={{background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.8rem'}}
                  >
                    수정
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateCategory(c.id);
                    }}
                    style={{background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: '0.8rem'}}
                  >
                    복사
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCategory(c.id);
                      if (selectedMainId === c.id) setSelectedMainId(null);
                    }}
                    style={{background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem'}}
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{flex: 1}}><Input value={newMain} onChange={e=>setNewMain(e.target.value)} placeholder="새 유형 등록" /></div>
            <div style={{paddingTop: '3px'}}><Button onClick={() => { if(newMain) { addCategory(newMain); setNewMain(''); }}}>추가</Button></div>
          </div>
        </div>

        {/* 소분류 구간 */}
        <div style={{ flex: 1, minWidth: '250px' }}>
          <h4 style={{marginTop: 0}}>상세 유형 (소분류)</h4>
          {!selectedCategory ? (
            <p className="text-secondary" style={{padding: '1rem', background: '#f8fafc', borderRadius: '8px', textAlign: 'center'}}>👈 좌측에서 관리할 유형을 하나 선택하세요.</p>
          ) : (
            <>
              <p style={{ fontSize: '0.9rem', color: '#1d4ed8', marginBottom: '1rem' }}><strong>[{selectedCategory.mainType}]</strong>에 속하는 상세 유형 목록입니다.</p>
              <p style={{ marginTop: '-0.4rem', marginBottom: '0.8rem', fontSize: '0.8rem', color: '#64748b' }}>드래그해서 순서를 변경할 수 있습니다.</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0' }}>
                {selectedCategory.subTypes.length === 0 && <li style={{padding: '0.5rem', fontSize: '0.9rem', color: '#94a3b8'}}>등록된 상세 유형이 없습니다.</li>}
                {selectedCategory.subTypes.map((s) => (
                  <li
                    key={s.id}
                    draggable
                    onDragStart={() => setDraggingSubId(s.id)}
                    onDragEnd={() => setDraggingSubId(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={async (e) => {
                      e.preventDefault();
                      if (!draggingSubId || draggingSubId === s.id) return;
                      await reorderSubCategory(selectedCategory.id, draggingSubId, s.id);
                      setDraggingSubId(null);
                    }}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.6rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      marginBottom: '0.5rem',
                      backgroundColor: draggingSubId === s.id ? '#e0f2fe' : '#ffffff',
                    }}
                  >
                    <div>{s.name}</div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleEditSubCategory(selectedCategory.id, s.id, s.name)}
                        style={{background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.8rem'}}
                      >
                        수정
                      </button>
                      <button
                        onClick={() => removeSubCategory(selectedCategory.id, s.id)}
                        style={{background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem'}}
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{flex: 1}}><Input value={newSub} onChange={e=>setNewSub(e.target.value)} placeholder="새 상세 유형 등록" /></div>
                <div style={{paddingTop: '3px'}}><Button onClick={() => { if(newSub) { addSubCategory(selectedCategory.id, newSub); setNewSub(''); }}}>추가</Button></div>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};

const HolidaySettings = () => {
  const { holidays, addHoliday, removeHoliday } = useSystemStore();
  const [newDate, setNewDate] = useState('');

  const handleAdd = () => {
    if (!newDate) return;
    addHoliday(newDate);
    setNewDate('');
  };

  const sorted = [...holidays].sort();

  return (
    <Card title="전사 공휴일 캘린더 등록" className="p-4-settings">
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>달력에서 휴무일로 지정하여 워킹데이(MD) 계산에서 제외될 공휴일을 세팅합니다.</p>
      <div style={{ display: 'flex', gap: '1rem', width: '300px', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
        <div style={{flex: 1}}>
          <Input type="date" label="공휴일 날짜 추가" value={newDate} onChange={e => setNewDate(e.target.value)} />
        </div>
        <div style={{paddingBottom: '2px'}}>
          <Button onClick={handleAdd}>지정</Button>
        </div>
      </div>

      <h4>설정된 공휴일 목록</h4>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {sorted.length === 0 ? <span style={{color: '#94a3b8', fontSize: '0.9rem'}}>등록된 휴무일이 없습니다.</span> : null}
        {sorted.map(d => (
          <div key={d} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.8rem', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '999px', color: '#b91c1c', fontSize: '0.9rem' }}>
            <strong>{d}</strong>
            <button onClick={() => removeHoliday(d)} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0, display: 'flex'}}>✖</button>
          </div>
        ))}
      </div>
    </Card>
  )
}

const AlarmSettings = () => {
  return (
    <Card title="알람 수신 설정 (추후 분리 페이즈 개발)" className="p-4-settings">
      <p style={{ color: 'var(--text-secondary)' }}>
        Slack API를 통한 푸시 전송 등은 별도 페이즈에서 구축할 예정입니다.
      </p>
    </Card>
  );
};
