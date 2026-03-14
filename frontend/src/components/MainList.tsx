import { Row, Col, Space } from "antd";
import ListingCard from "./ListingCard";
import React, { useState, useEffect, useRef, useCallback } from "react";


const MainList: React.FC = () => {
  const [visibleCount, setVisibleCount] = useState(36); 
  const items = Array.from({ length: 152 }); 

  const sentinelRef = useRef(null);
  
  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + 12, items.length));
  }, [items.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < items.length) {
          loadMore();
        }
      },
      { threshold: 1.0 }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => {
      if (sentinelRef.current) {
        observer.unobserve(sentinelRef.current);
      }
    };
  }, [visibleCount, items.length, loadMore]);

  return (
    <Space className="main-list" orientation="vertical" size={12}>
      <Row gutter={[12, 12]} justify="start">
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
      )}
    </Space>
  );
};

export default MainList;