import { Flex, Layout, Row, Space, Typography, Image, Avatar } from 'antd';
import { Content } from 'antd/es/layout/layout';
import "../styles/AccountViewStyle.css";
import Title from 'antd/es/typography/Title';
import { Link } from 'react-router-dom';


const { Text } = Typography;

const AccountView = () => {
  const currentUser = {
    nickname: 'KishlakEnjoyer',
    tg_username: '@jdm_enjoyerr',
    balance: 3.02,
    image_url: 'ava.png',
    about_me: 'TG invester from Russia. Let\'s trade!'
  };


  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content className='account-container'>
        <Flex className='top-info' vertical={false}>
          <Flex className='top-info' vertical={false}>
            <Avatar size={140} src={currentUser.image_url} style={{border: '1px solid gray'}}/>
            <Flex className='user-info' vertical>
              <Title level={2}>{currentUser.nickname}</Title>
              <Link to={'https://ant-design.antgroup.com/components/typography'} >{currentUser.tg_username}</Link>
              <Text>{currentUser.about_me}</Text>
            </Flex>
          </Flex>
        </Flex>
        <Flex className='albums-of-presents'>

        </Flex>
        <Space className="main-list" orientation="vertical" size={12}>
          {/* <Row gutter={[12, 12]} justify="start">
            {items.slice(0, visibleCount).map((_, index) => (
              <Col
                key={index}
                xs={12}
                sm={8}
                md={6}
                lg={4}
                xl={3}
              >
                <ListingCard />
              </Col>
            ))}
          </Row>

          {visibleCount < items.length && (
            <div
              ref={sentinelRef}
              style={{
                height: "20px",
                width: "100%",
                textAlign: "center",
                fontSize: "14px",
                color: "#999",
              }}
            >
              Загрузка...
            </div>
          )} */}
        </Space>
      </Content>
    </Layout>
  );
}

export default AccountView;