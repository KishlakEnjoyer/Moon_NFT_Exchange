import React, { useState, useEffect } from 'react';
import { ConfigProvider, Layout, theme } from 'antd';
import { Routes, Route } from 'react-router-dom';
import MainView from './views/MainView';
import AccountView from './views/AccountView';
import MainHeader from './components/MainHeader';
import MainFooter from './components/MainFooter';

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('darkMode');
    return savedTheme ? JSON.parse(savedTheme) : false;
  });

  const [showSuccessGlow, setShowSuccessGlow] = useState(false);
  const [showFailGlow, setShowFailGlow] = useState(false);
  const [showLogoutGlow, setShowLogoutGlow] = useState(false);

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

  

  return (
    <>
    <div className={`glow-blum big ${showSuccessGlow ? 'success' : ''} ${showFailGlow ? 'fail' : ''} ${showLogoutGlow ? 'logout' : ''}`}></div>
    <div className="glow-blum small"></div>

    <ConfigProvider theme={{
      algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: {
        fontFamily: 'Geist, sans-serif',
        colorPrimary: '#2b4acb',
      },
      components: {
        Pagination: {
          borderRadius: 999,
        },
        Card: {
          borderRadius: 12,
        },
        
      }
    }}>
      <Layout className='App'>
        <MainHeader darkMode={darkMode} onThemeChange={setDarkMode} onAuthSuccess={triggerSuccessGlow} onAuthFail={triggerFailGlow} onLogout={triggerLogoutGlow}/>
          <Routes> 
            <Route path="/" element={<MainView />} />
            <Route path="/account" element={<AccountView/>} />
          </Routes>
          <MainFooter/>
      </Layout>
    </ConfigProvider>
    </>
  );
}

export default App;