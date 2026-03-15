import "../styles/MainViewStyle.css";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { FloatButton, Layout } from "antd";
import { Content } from "antd/es/layout/layout";
import MainList from "../components/MainList";
import FilterBar from "../components/FilterBar";
import { UpOutlined } from "@ant-design/icons";

const MainView = () => {
  useDocumentTitle("Moon Exchange - Home");

  return (
    <Layout style={{ minHeight: "var(--size-screen)" }}>
      <Content className="main-container">
        <div className="filter-sticky">
          <FilterBar />
        </div>
        <MainList />
        <FloatButton.BackTop icon={<UpOutlined/>} style={{ right: 'var(--size-s)', bottom: 'var(--size-s)' }} shape="square"/>
      </Content>
    </Layout>
  );
};

export default MainView;
