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
    <Layout style={{ minHeight: "100vh" }}>
      <Content className="main-container">
        <div className="filter-sticky">
          <FilterBar />
        </div>
        <MainList />
        <FloatButton.BackTop icon={<UpOutlined/>} style={{ right: '10px', bottom: '10px' }} shape="square"/>
      </Content>
    </Layout>
  );
};

export default MainView;
