import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useUserStore } from '../store/userStore';
import './Login.css';

export const Login = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [part, setPart] = useState('');
  const [position, setPosition] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const login = useUserStore((state) => state.login);
  const register = useUserStore((state) => state.register);
  const navigate = useNavigate();

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (login(id, pw)) {
      navigate('/');
    } else {
      setError('아이디 또는 비밀번호가 일치하지 않습니다. (테스트 계정: watchtek / 1234)');
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const result = await register({
      id,
      pw,
      name,
      department,
      part,
      position,
      role: 'team-member',
    });

    if (!result.ok) {
      setError(result.message ?? '회원등록에 실패했습니다.');
      return;
    }

    setSuccess('회원등록이 완료되었습니다. 로그인해 주세요.');
    setMode('login');
    setPw('');
    setName('');
    setDepartment('');
    setPart('');
    setPosition('');
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-logo">Watchtek Report</h1>
        <p className="login-desc">팀의 업무 현황을 한눈에 파악하세요</p>
        
        <Card className="p-4-login">
          <div className="login-switch-row">
            <button
              type="button"
              className={`switch-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setMode('login');
                setError('');
                setSuccess('');
              }}
            >
              로그인
            </button>
            <button
              type="button"
              className={`switch-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => {
                setMode('register');
                setError('');
                setSuccess('');
              }}
            >
              회원등록
            </button>
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="login-form">
            {error && <div className="login-error">{error}</div>}
            {success && <div className="login-success">{success}</div>}
            <Input 
              label="사번 (ID)" 
              placeholder="사번을 입력하세요 (예: watchtek)" 
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
            />
            <Input 
              label="비밀번호" 
              type="password"
              placeholder={mode === 'login' ? '비밀번호 (예: 1234)' : '사용할 비밀번호를 입력하세요'}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              required
            />

            {mode === 'register' && (
              <>
                <Input
                  label="이름"
                  placeholder="이름을 입력하세요"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  label="소속명(팀)"
                  placeholder="예: 솔루션본부"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                />
                <Input
                  label="파트 (선택)"
                  placeholder="예: A 파트"
                  value={part}
                  onChange={(e) => setPart(e.target.value)}
                />
                <Input
                  label="직급"
                  placeholder="예: 사원"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  required
                />
              </>
            )}

            <Button type="submit" size="lg" fullWidth className="mt-4">
              {mode === 'login' ? '로그인' : '회원등록 완료'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
