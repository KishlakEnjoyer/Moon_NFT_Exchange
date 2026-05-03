import React, { useState, useEffect } from 'react';
import { ConfigProvider, Layout, theme } from 'antd';
import enUS from 'antd/locale/en_US';
import ruRU from 'antd/locale/ru_RU';

import { Routes, Route } from 'react-router-dom';
import MainView from './views/MainView';
import AccountView from './views/AccountView';
import AdminView from './views/AdminView';
import MainHeader from './components/MainHeader';
import MainFooter from './components/MainFooter';
import NotFound from './views/NotFound';
import { useTranslation } from 'react-i18next';

function App() {
  const { i18n } = useTranslation();
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('darkMode');
    return savedTheme ? JSON.parse(savedTheme) : false;
  });

  const [showSuccessGlow, setShowSuccessGlow] = useState(false);
  const [showFailGlow, setShowFailGlow] = useState(false);
  const [showLogoutGlow, setShowLogoutGlow] = useState(false);
  const [isAccountBlocked, setIsAccountBlocked] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser') || '{}')?.is_active === 0;
    } catch {
      return false;
    }
  });

  const triggerSuccessGlow = () => {
    setShowSuccessGlow(true);
    setShowFailGlow(false);
    setTimeout(() => setShowSuccessGlow(false), 2000);
  };

  const triggerFailGlow = () => {
    setShowFailGlow(true);
    setShowSuccessGlow(false);
    setTimeout(() => setShowFailGlow(false), 2000);
  };

  const triggerLogoutGlow = () => {
    setShowLogoutGlow(true);
    setTimeout(() => setShowLogoutGlow(false), 2000);
  };


  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const syncBlockedState = () => {
      try {
        setIsAccountBlocked(JSON.parse(localStorage.getItem('currentUser') || '{}')?.is_active === 0);
      } catch {
        setIsAccountBlocked(false);
      }
    };

    window.addEventListener('storage', syncBlockedState);
    window.addEventListener('accountBlocked', syncBlockedState);

    return () => {
      window.removeEventListener('storage', syncBlockedState);
      window.removeEventListener('accountBlocked', syncBlockedState);
    };
  }, []);

  return (
    <>
    <div className={`glow-blum big ${showSuccessGlow ? 'success' : ''} ${showFailGlow || isAccountBlocked ? 'fail' : ''} ${showLogoutGlow ? 'logout' : ''}`}></div>
    <div className="glow-blum small"></div>

    <ConfigProvider locale={i18n.language.startsWith('ru') ? ruRU : enUS} theme={{
      algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: {
        fontFamily: 'Geist, sans-serif',
        colorPrimary: '#2b4acb',
      },
      components: {
        Pagination: {
          borderRadius: 999,
        },
        Modal: {
          contentBg: darkMode ? 'var(--liquid-glass-bg-accent)' : 'var(--liquid-glass-bg-light-theme)',
          headerBg: 'transparent',
        },
        Card: {
          colorBgContainer: darkMode ? 'var(--liquid-glass-bg)' : 'var(--liquid-glass-bg-light-theme)',
          borderRadius: 12,
        },
        Button: {
          colorBgContainer: darkMode ? 'var(--liquid-glass-bg-secondary)' : 'var(--liquid-glass-bg-light-theme)',
        },
      }
    }}>
      <Layout className='App'>
        <MainHeader darkMode={darkMode} onThemeChange={setDarkMode} onAuthSuccess={triggerSuccessGlow} onAuthFail={triggerFailGlow} onLogout={triggerLogoutGlow}/>
          <Routes> 
            <Route path="/" element={<MainView />} />
            <Route path="/account/:username" element={<AccountView/>} />
            <Route path="/admin" element={<AdminView/>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <MainFooter/>
      </Layout>
    </ConfigProvider>
    </>
  );
}

export default App;
