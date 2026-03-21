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
    { collectionName: "Plush Pepe", presentImage: "pepe4.png", presentNumber: 4, presentPrice: 200 },

  ];

  return (
    <Layout className="min-h-screen">
      <Content className="py-[var(--size-2xs)] px-[var(--size-4xl)]">
        <div className="sticky top-0 z-[200] py-[var(--size-sm)] h-auto">
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
        <FloatButton.BackTop icon={<UpOutlined/>} className="!bg-[var(--liquid-glass-bg)] !right-[var(--size-s)] !bottom-[var(--size-s)]" shape="square"/>
      </Content>
    </Layout>
  );
};

export default MainView;
