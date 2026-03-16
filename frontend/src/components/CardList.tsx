import { Row, Col, Space } from "antd";
import { useState, useEffect, useRef, useCallback } from "react";

interface CardListProps<T> {
  items: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
}

const CardList = <T,>({ items, renderCard }: CardListProps<T>) => {
  const [visibleCount, setVisibleCount] = useState(36);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + 12, items.length));
  }, [items.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < items.length) loadMore();
      },
      { threshold: 1.0 }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => { if (sentinelRef.current) observer.unobserve(sentinelRef.current); };
  }, [visibleCount, items.length, loadMore]);

  return (
    <Space className="main-list" orientation="vertical" size={12}>
      <Row gutter={[12, 12]} justify="start">
        {items.slice(0, visibleCount).map((item, index) => (
          <Col key={index} xs={12} sm={8} md={6} lg={4} xl={3}>
            <div style={{ width: "100%" }}>
              {renderCard(item, index)}
            </div>
          </Col>
        ))}
      </Row>

      {visibleCount < items.length && (
        <div
          ref={sentinelRef}
          style={{
            height: "var(--size-lg)",
            width: "100%",
            textAlign: "center",
            fontSize: "var(--size-smm)",
            color: "var(--white-60)",
          }}
        >
          Загрузка...
        </div>
      )}
    </Space>
  );
};

export default CardList;