import { Flex, Layout, Row, Space, Typography, Image, Avatar } from 'antd';
import { Content } from 'antd/es/layout/layout';
import "../styles/AccountViewStyle.css";


const { Text } = Typography;

const AccountView = () => {
  const currentUser = {
    nickname: 'KishlakEnjoyer',
    balance: 3.02,
    image_url: 'ava.png'
  };


  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content className='account-container'>
        <Flex className='top-info'>
          <Avatar size={140} src={currentUser.image_url} style={{border: '1px solid gray'}}/>
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