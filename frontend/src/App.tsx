import React, { useState } from 'react';
import { ConfigProvider, Layout, theme } from 'antd';
import { Routes, Route } from 'react-router-dom';
import MainView from './views/MainView';
import AccountView from './views/AccountView';
import MainHeader from './components/MainHeader';
import MainFooter from './components/MainFooter';


function App() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <ConfigProvider theme={{
      algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: {
        fontFamily: 'Geist, sans-serif',
      },
      components: {
        Pagination: {
          borderRadius: 999,
        },
        Card: {
          borderRadius: 12,
        }
      }
    }}>
      <Layout className='App'>
        <MainHeader darkMode={darkMode} onThemeChange={setDarkMode}/>
          <Routes> 
            <Route path="/" element={<MainView />} />
            <Route path="/account" element={<AccountView/>} />
          </Routes>
          <MainFooter/>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
