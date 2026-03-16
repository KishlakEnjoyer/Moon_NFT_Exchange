import "../styles/MainViewStyle.css";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { FloatButton, Layout } from "antd";
import { Content } from "antd/es/layout/layout";
import FilterBar from "../components/FilterBar";
import { UpOutlined } from "@ant-design/icons";
import ListingCard from "../components/ListingCard";
import CardList from "../components/CardList";

const MainView = () => {
  useDocumentTitle("Moon Exchange - Home");
  const lots = [
    { collectionName: "Cap", presentImage: "cap.png", presentNumber: 1, presentPrice: 50 },
    { collectionName: "Plush Pepe", presentImage: "pepe.png", presentNumber: 1, presentPrice: 120 },
    { collectionName: "Plush Pepe", presentImage: "pepe2.png", presentNumber: 2, presentPrice: 150 },
    { collectionName: "Plush Pepe", presentImage: "pepe3.png", presentNumber: 3, presentPrice: 180 },
    { collectionName: "Plush Pepe", presentImage: "pepe4.png", presentNumber: 4, presentPrice: 200 },

  ];

  return (
    <Layout style={{ minHeight: "var(--size-screen)" }}>
      <Content className="main-container">
        <div className="filter-sticky">
          <FilterBar />
        </div>
        <CardList
          items={lots}
          renderCard={(item) => (
            <ListingCard
              collectionName={item.collectionName}
              presentImage={item.presentImage}
              presentNumber={item.presentNumber}
              presentPrice={item.presentPrice}
            />
          )}
        />
        <FloatButton.BackTop icon={<UpOutlined/>} style={{ right: 'var(--size-s)', bottom: 'var(--size-s)' }} shape="square"/>
      </Content>
    </Layout>
  );
};

export default MainView;
