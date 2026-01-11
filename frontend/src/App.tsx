import React from 'react';
import './styles/App.css';
import { ConfigProvider, Layout, theme } from 'antd';
import { Routes, Route } from 'react-router-dom';
import MainView from './views/MainView';
import { Content } from 'antd/es/layout/layout';


function App() {
  return (
    <ConfigProvider theme={{
      algorithm: theme.darkAlgorithm,
      //algorithm: theme.defaultAlgorithm,
      token: {
        fontFamily: 'Geist, sans-serif',
      },
    }}>
      <Layout className='App'>
          <Routes>
            <Route path="/" element={<MainView />} />
            <Route path="*" element={<div>404 — Страница не найдена</div>} />
          </Routes>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
