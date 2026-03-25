import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useUserStore } from '../store/userStore';
import './Login.css';

export const Login = () => {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const login = useUserStore((state) => state.login);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(id, pw)) {
      navigate('/');
    } else {
      setError('아이디 또는 비밀번호가 일치하지 않습니다. (테스트 계정: watchtek / 1234)');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-logo">Watchtek Report</h1>
        <p className="login-desc">팀의 업무 현황을 한눈에 파악하세요</p>
        
        <Card className="p-4-login">
          <form onSubmit={handleLogin} className="login-form">
            {error && <div className="login-error">{error}</div>}
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
              placeholder="비밀번호 (예: 1234)" 
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              required
            />
            <Button type="submit" size="lg" fullWidth className="mt-4">
              로그인
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
