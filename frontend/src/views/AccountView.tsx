import { Layout, Typography } from 'antd';
import { Content } from 'antd/es/layout/layout';
import "../styles/AccountViewStyle.css";


const { Text } = Typography;

const AccountView = () => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content className='account-container'>
        <Text>Account View</Text>
      </Content>
    </Layout>
  );
}

export default AccountView;