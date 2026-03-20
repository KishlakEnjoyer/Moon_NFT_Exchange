import { FilterOutlined, CloseOutlined } from "@ant-design/icons";
import {
  Input, Select, Row, Col, Dropdown,
  Button, Slider, Typography,
} from "antd";
import { useState } from "react";
import TONIcon from "./icons/TONIcon";

const { Text } = Typography;

const glassEffect = "!bg-[var(--liquid-glass-bg)]"

const FilterBar = () => {
  const popupContainer = () => document.body;
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [sortOrder, setSortOrder] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const handleClear = () => {
    setPriceRange([0, 100]);
    setSortOrder(null);
  };

  const handleApply = () => {
    console.log({ priceRange, sortOrder });
    setOpen(false);
  };

  const filterPopup = (
    <div className="flex flex-col w-[260px] gap-[var(--size-base)] rounded-[var(--size-smm)] p-[var(--size-base)]
    border border-solid border-gray-800 bg-[var(--ant-color-bg-elevated)]" >
      <div>
        <Text strong>Price, <TONIcon/> TON</Text>
        <Row align="middle" gutter={8} style={{ marginTop: 8 }}>
          <Col>
            <Text>{priceRange[0]}</Text>
          </Col>
          <Col flex="auto">
            <Slider
              range
              min={0}
              max={3000}
              value={priceRange}
              onChange={(val) => setPriceRange(val as [number, number])}
            />
          </Col>
          <Col>
            <Text>{priceRange[1]}</Text>
          </Col>
        </Row>
      </div>

      <div>
        <Text strong>Sort </Text>
        <Select
          style={{ width: "100%", marginTop: 8 }}
          placeholder="Select sorting"
          value={sortOrder}
          onChange={setSortOrder}
          options={[
            { value: "price_desc", label: "By price (Desc)" },
            { value: "price_asc",  label: "By price (Asc)" },
            { value: "newest",     label: "New ones first" },
          ]}
        />
      </div>

      <Button
        block
        danger
        icon={<CloseOutlined />}
        onClick={handleClear}
      >
        Clear all
      </Button>
      <Button
        block
        type="primary"
        onClick={handleApply}
        style={{ background: "#3a7d44" }}
      >
        Apply
      </Button>
    </div>
  );

  return (
    <Row className="w-full" 
      gutter={[12, 12]} align="middle" >
      <Col flex="auto">
        <Input.Search
          className="w-full"
          placeholder="Search"
          allowClear
          size="large"
        />
      </Col>
      <Col flex="auto">
        <Select className={`${glassEffect} w-full`}
          placeholder="Collection"  getPopupContainer={popupContainer} size="large" />
      </Col>
      <Col flex="auto">
        <Select className={`${glassEffect} w-full`}
          placeholder="Model"  getPopupContainer={popupContainer} size="large" />
      </Col>
      <Col flex="auto">
        <Select className={`${glassEffect} w-full`}
          placeholder="Background"  getPopupContainer={popupContainer} size="large" />
      </Col>
      <Col flex="auto">
        <Select className={`${glassEffect} w-full`}
          placeholder="Symbol"  getPopupContainer={popupContainer} size="large" />
      </Col>

      <Col style={{ maxWidth: "40px" }}>
        <Dropdown
          open={open}
          onOpenChange={setOpen}
          trigger={["click"]}
          getPopupContainer={popupContainer}
          popupRender={() => filterPopup} 
          placement="bottomRight"
        >
          <Button icon={<FilterOutlined />} size="large" className={`${glassEffect} w-full antd-icon`} />
        </Dropdown>
      </Col>
    </Row>
  );
};

export default FilterBar;