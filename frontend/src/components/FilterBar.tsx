import {
  Input,
  Select,
  Space,
  Row,
  Col,
  Button,
  Dropdown,
  InputNumber,
  Divider,
  Typography,
} from "antd";
import { FilterOutlined, CloseOutlined } from "@ant-design/icons";

const { Text } = Typography;

const FilterBar = () => {
  return (
    <Row gutter={[12, 12]} align="middle">
      <Col flex="auto">
        <Input.Search placeholder="Search" allowClear />
      </Col>

      <Col><Select placeholder="Collection" style={{ width: 250 }} /></Col>
      <Col><Select placeholder="Model" style={{ width: 250 }} /></Col>
      <Col><Select placeholder="Background" style={{ width: 250 }} /></Col>
      <Col><Select placeholder="Symbol" style={{ width: 250 }} /></Col>

      <Col>
        <Dropdown
          trigger={["click"]}
          popupRender={() => (
            <div style={{ padding: 16, width: 260 }}>
              <Space orientation="vertical" size={16} style={{ width: "100%" }}>

                <div>
                  <Text strong>Цена</Text>
                  <Space style={{ marginTop: 8 }}>
                    <InputNumber placeholder="0" min={0} />
                    <Text>–</Text>
                    <InputNumber placeholder="100" min={0} />
                  </Space>
                </div>

                <Divider style={{ margin: "8px 0" }} />

                <div>
                  <Text strong>Сортировка</Text>
                  <Select
                    style={{ width: "100%", marginTop: 8 }}
                    options={[
                      { label: "По цене (Убывание)", value: "price_desc" },
                      { label: "По цене (Возрастание)", value: "price_asc" },
                    ]}
                  />
                </div>

                <Space orientation="vertical" style={{ width: "100%" }}>
                  <Button danger icon={<CloseOutlined />} block>
                    Очистить все
                  </Button>
                  <Button type="primary" block>
                    Применить
                  </Button>
                </Space>

              </Space>
            </div>
          )}
        >
          <span>
            <Button icon={<FilterOutlined />} />
          </span>
        </Dropdown>
      </Col>
    </Row>
  );
};

export default FilterBar;
