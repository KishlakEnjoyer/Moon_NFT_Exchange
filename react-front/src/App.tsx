import React from 'react';
import './styles/App.css';
import { ConfigProvider, theme } from 'antd';
import { Routes, Route } from 'react-router-dom';


function App() {
  return (
    <ConfigProvider theme={{
      algorithm: theme.darkAlgorithm
    }}>
      <div className="App">
        <Routes>
          <Route path="/" element={<div>Главная страница</div>} />
          <Route path="*" element={<div>404 — Страница не найдена</div>} />
        </Routes>
      </div>
    </ConfigProvider>
  );
}

export default App;
