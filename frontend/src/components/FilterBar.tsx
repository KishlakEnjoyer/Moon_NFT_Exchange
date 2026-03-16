import { FilterOutlined, CloseOutlined } from "@ant-design/icons";
import {
  Input, Select, Row, Col, Dropdown,
  Button, Slider, Typography,
} from "antd";
import { useState } from "react";

const { Text } = Typography;

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
    <div style={{
      background: "var(--color-bg-elevated, #1f1f1f)",
      border: "1px solid var(--color-border, #333)",
      borderRadius: 12,
      padding: 16,
      width: 260,
      display: "flex",
      flexDirection: "column",
      gap: 16,
    }}>
      {/* Цена */}
      <div>
        <Text strong>Цена</Text>
        <Row align="middle" gutter={8} style={{ marginTop: 8 }}>
          <Col>
            <Text>{priceRange[0]}</Text>
          </Col>
          <Col flex="auto">
            <Slider
              range
              min={0}
              max={1000}
              value={priceRange}
              onChange={(val) => setPriceRange(val as [number, number])}
            />
          </Col>
          <Col>
            <Text>{priceRange[1]}</Text>
          </Col>
        </Row>
      </div>

      {/* Сортировка */}
      <div>
        <Text strong>Сортировка</Text>
        <Select
          style={{ width: "100%", marginTop: 8 }}
          placeholder="Выберите сортировку"
          value={sortOrder}
          onChange={setSortOrder}
          options={[
            { value: "price_desc", label: "По цене (Убывание)" },
            { value: "price_asc",  label: "По цене (Возрастание)" },
            { value: "newest",     label: "Сначала новые" },
          ]}
        />
      </div>

      {/* Кнопки */}
      <Button
        block
        danger
        icon={<CloseOutlined />}
        onClick={handleClear}
      >
        Очистить все
      </Button>
      <Button
        block
        type="primary"
        onClick={handleApply}
        style={{ background: "#3a7d44" }}
      >
        Применить
      </Button>
    </div>
  );

  return (
    <Row gutter={[12, 12]} align="middle" style={{ width: "100%" }}>
      <Col flex="auto">
        <Input.Search placeholder="Search" allowClear size="large" style={{ width: "100%" }} />
      </Col>
      <Col flex="auto">
        <Select placeholder="Collection" style={{ width: "100%" }} getPopupContainer={popupContainer} size="large" />
      </Col>
      <Col flex="auto">
        <Select placeholder="Model" style={{ width: "100%" }} getPopupContainer={popupContainer} size="large" />
      </Col>
      <Col flex="auto">
        <Select placeholder="Background" style={{ width: "100%" }} getPopupContainer={popupContainer} size="large" />
      </Col>
      <Col flex="auto">
        <Select placeholder="Symbol" style={{ width: "100%" }} getPopupContainer={popupContainer} size="large" />
      </Col>

      <Col style={{ maxWidth: "40px" }}>
        <Dropdown
          open={open}
          onOpenChange={setOpen}
          trigger={["click"]}
          getPopupContainer={popupContainer}
          dropdownRender={() => filterPopup}  // ← вот главное изменение
          placement="bottomRight"
        >
          <Button icon={<FilterOutlined />} size="large" className="icon-antd" />
        </Dropdown>
      </Col>
    </Row>
  );
};

export default FilterBar;