// src/App.js
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import store from './store';
import { loadUser } from './actions/authActions';
import { connectSocket, disconnectSocket } from './services/socketService';

// 컴포넌트 임포트
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/Dashboard';
import ChatRoom from './components/chat/ChatRoom';
import CreateRoom from './components/chat/CreateRoom';
import Profile from './components/user/Profile';
import PrivateRoute from './components/routing/PrivateRoute';
import Header from './components/layout/Header';
import LanguageSelector from './components/layout/LanguageSelector';

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 사용자 정보 로드
    store.dispatch(loadUser()).then(() => {
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });

    // 소켓 연결
    const { auth } = store.getState();
    if (auth.isAuthenticated && auth.user) {
      connectSocket(auth.user._id);
    }

    // 언마운트 시 소켓 연결 해제
    return () => {
      disconnectSocket();
    };
  }, []);

  if (isLoading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  return (
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>
        <Router>
          <div className="app">
            <Header />
            <LanguageSelector />
            <div className="container">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <PrivateRoute>
                      <Dashboard />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/chat/:roomId" 
                  element={
                    <PrivateRoute>
                      <ChatRoom />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/create-room" 
                  element={
                    <PrivateRoute>
                      <CreateRoom />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <PrivateRoute>
                      <Profile />
                    </PrivateRoute>
                  } 
                />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </div>
        </Router>
      </I18nextProvider>
    </Provider>
  );
};

export default App;

// src/components/auth/Login.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { login } from '../../actions/authActions';
import { Link } from 'react-router-dom';

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, error } = useSelector(state => state.auth);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const { email, password } = formData;
  
  useEffect(() => {
    // 로그인 상태인 경우, 대시보드로 리다이렉트
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);
  
  const onChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const onSubmit = e => {
    e.preventDefault();
    dispatch(login(email, password));
  };
  
  return (
    <div className="auth-container">
      <h1 className="auth-title">{t('login.title')}</h1>
      <p className="auth-subtitle">{t('login.subtitle')}</p>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <form className="auth-form" onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="email">{t('login.email')}</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={onChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">{t('login.password')}</label>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={onChange}
            required
          />
        </div>
        
        <button type="submit" className="btn btn-primary btn-block">
          {t('login.loginButton')}
        </button>
      </form>
      
      <p className="auth-redirect">
        {t('login.noAccount')} <Link to="/register">{t('login.registerLink')}</Link>
      </p>
    </div>
  );
};

export default Login;

// src/components/auth/Register.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { register } from '../../actions/authActions';
import { Link } from 'react-router-dom';

const Register = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, error } = useSelector(state => state.auth);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
    language: 'ko' // 기본 언어: 한국어
  });
  
  const { username, email, password, password2, language } = formData;
  
  useEffect(() => {
    // 로그인 상태인 경우, 대시보드로 리다이렉트
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);
  
  const onChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const onSubmit = e => {
    e.preventDefault();
    
    if (password !== password2) {
      // Redux에서 처리할 에러 액션을 추가할 수도 있음
      alert(t('register.passwordMismatch'));
      return;
    }
    
    dispatch(register({ username, email, password, language }));
  };
  
  return (
    <div className="auth-container">
      <h1 className="auth-title">{t('register.title')}</h1>
      <p className="auth-subtitle">{t('register.subtitle')}</p>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <form className="auth-form" onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="username">{t('register.username')}</label>
          <input
            type="text"
            id="username"
            name="username"
            value={username}
            onChange={onChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">{t('register.email')}</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={onChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">{t('register.password')}</label>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={onChange}
            required
            minLength="6"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password2">{t('register.confirmPassword')}</label>
          <input
            type="password"
            id="password2"
            name="password2"
            value={password2}
            onChange={onChange}
            required
            minLength="6"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="language">{t('register.language')}</label>
          <select
            id="language"
            name="language"
            value={language}
            onChange={onChange}
          >
            <option value="ko">{t('languages.korean')}</option>
            <option value="en">{t('languages.english')}</option>
            <option value="ms">{t('languages.malay')}</option>
          </select>
        </div>
        
        <button type="submit" className="btn btn-primary btn-block">
          {t('register.registerButton')}
        </button>
      </form>
      
      <p className="auth-redirect">
        {t('register.haveAccount')} <Link to="/login">{t('register.loginLink')}</Link>
      </p>
    </div>
  );
};

export default Register;
