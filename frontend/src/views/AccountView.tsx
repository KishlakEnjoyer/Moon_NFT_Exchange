import { Layout } from 'antd';
import React, { PureComponent } from 'react';
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";
import { Content } from 'antd/es/layout/layout';

const AccountView = () => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <MainHeader />
      <Content>
        
      </Content>
      <MainFooter/>
    </Layout>
  );
}

export default AccountView;