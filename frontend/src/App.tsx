import React from 'react';
import './styles/App.css';
import { ConfigProvider, Layout, theme } from 'antd';
import { Routes, Route } from 'react-router-dom';
import MainView from './views/MainView';
import AccountView from './views/AccountView';


function App() {
  return (
    <ConfigProvider theme={{
      algorithm: theme.darkAlgorithm,
      //algorithm: theme.defaultAlgorithm,
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
          <Routes> 
            <Route path="/" element={<MainView />} />
            <Route path="/account" element={<AccountView/>} />
          </Routes>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
