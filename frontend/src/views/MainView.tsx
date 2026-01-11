import "../styles/MainView.css";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { Layout, Space } from "antd";
import { Content } from "antd/es/layout/layout";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";
import MainList from "../components/MainList";
import FilterBar from "../components/FilterBar";

const MainView = () => {
  useDocumentTitle("Moon Exchange - Home");
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <MainHeader/>
      <Content className="main-container">
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          <FilterBar />
          <MainList />
        </Space>
      </Content>
      <MainFooter/>
    </Layout>
  );
}

export default MainView;
