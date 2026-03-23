import useDocumentTitle from "../hooks/useDocumentTitle";
import { FloatButton, Layout } from "antd";
import { Content } from "antd/es/layout/layout";
import FilterBar from "../components/FilterBar";
import { UpOutlined } from "@ant-design/icons";
import ListingCard from "../components/ListingCard";
import CardList from "../components/CardList";
import { getActiveListings, ListingFull } from "../fictive_data/listings";
import ModalPresentDetail from "../components/ModalPresentDetail";
import { useState } from "react";

const MainView = () => {
  useDocumentTitle("Moon Exchange - Home");

  const lots = getActiveListings();
  const [selectedPresent, setSelectedPresent] = useState<ListingFull | null>(null);
  

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
              item={item}
              collectionName={item.present.collectionName}
              presentImage={item.present.image_url}
              presentNumber={item.present.present_num}
              presentPrice={item.price}
              onPresentClick={() => setSelectedPresent(item)}
            />
          )}
        />
        <FloatButton.BackTop icon={<UpOutlined/>} className="!bg-[var(--liquid-glass-bg)] !right-[var(--size-s)] !bottom-[var(--size-s)]" shape="square"/>
        <ModalPresentDetail
          open={!!selectedPresent}
          item={selectedPresent}
          onClose={() => setSelectedPresent(null)}
        />
      </Content>
    </Layout>
  );
};

export default MainView;
