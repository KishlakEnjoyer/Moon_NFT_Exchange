// MainView.tsx
import "../styles/MainView.css";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { Button, Layout } from "antd";
import { Content } from "antd/es/layout/layout";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";
import MainList from "../components/MainList";
import FilterBar from "../components/FilterBar";
import { useEffect, useState } from "react";
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
        <div className="filter-sticky">
          <FilterBar />
        </div>

        <MainList />

        {showScrollTop && (
          <Button
            onClick={scrollToTop}
            className="button-up"
            icon={<UpOutlined />}
          />
        )}
      </Content>

      <MainFooter />
    </Layout>
  );
};

export default MainView;
