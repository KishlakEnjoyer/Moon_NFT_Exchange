// MainView.tsx
import "../styles/MainView.css";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { Button, Layout, Space } from "antd";
import { Content } from "antd/es/layout/layout";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";
import MainList from "../components/MainList";
import FilterBar from "../components/FilterBar";
import { useEffect, useState } from "react"; // ← добавили
import { UpOutlined } from "@ant-design/icons";

const MainView = () => {
  useDocumentTitle("Moon Exchange - Home");

  // Для кнопки "вверх"
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Показываем кнопку, если прокрутили больше 400px
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <MainHeader />
      <Content className="main-container">
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          {/* 👇 Прилипающий фильтр */}
          <div
            style={{
              position: "sticky",
              top: 64, // высота MainHeader (если он fixed), иначе 0
              zIndex: 10,
              background: "var(--bg-layout)", // или белый/тёмный фон
              padding: "12px 0", // чтобы не "прыгало"
            }}
          >
            <FilterBar />
          </div>

          <MainList />
        </Space>

        {/* 👇 Кнопка "вверх" */}
        {showScrollTop && (
          <Button
            onClick={scrollToTop}
            style={{
              position: "fixed",
              bottom: "24px",
              right: "10px",
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              zIndex: 100,
            }}
            icon={<UpOutlined />}
          />
        )}
      </Content>
      <MainFooter />
    </Layout>
  );
};

export default MainView;