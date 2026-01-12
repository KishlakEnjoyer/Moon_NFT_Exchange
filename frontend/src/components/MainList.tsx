import { Row, Col, Pagination, Space } from "antd";
import ListingCard from "./ListingCard";
import { useState } from "react";

const PAGE_SIZE = 16;

const MainList = () => {
  const [page, setPage] = useState(1);

  // фейковые данные
  const items = Array.from({ length: 152 });

  const start = (page - 1) * PAGE_SIZE;
  const currentItems = items.slice(start, start + PAGE_SIZE);

  return (
    <Space className="main-list" orientation="vertical" size={12} >
      <Row gutter={[12, 12]} justify="start"> 
        {currentItems.map((_, index) => (
          <Col
            key={index}
            xs={12}     // 2 в ряд на мобильных
            sm={8}      // 3 в ряд на маленьких планшетах
            md={6}      // 4 в ряд на больших планшетах
            lg={4}      // 3 в ряд на десктопах (ноутбуках)
            xl={3}      // 4 в ряд на больших экранах
          >
            <div style={{ width: "100%", height: '100%', display: "flex", justifyContent: "center" }}>
              <ListingCard />
            </div>
          </Col>
        ))}
      </Row>

      <Pagination
        current={page}
        total={items.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
        showSizeChanger={false}
        align="center"
        style={{
          marginTop: 'auto',
          position:'fixed',
          bottom: 'var(--size-4xl)',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      />
    </Space>
  );
};

export default MainList;