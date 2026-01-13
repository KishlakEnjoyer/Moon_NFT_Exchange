import { FilterOutlined } from "@ant-design/icons";
import {
  Input,
  Select,
  Row,
  Col,
  Dropdown,
  Button,
} from "antd";


const FilterBar = () => {
  const popupContainer = () => document.body;
  return (
    <Row gutter={[12, 12]} align="middle">
      <Col flex="auto">
        <Input.Search placeholder="Search" allowClear size="large"/>
      </Col>

      <Col>
        <Select
          placeholder="Collection"
          style={{ width: 250 }}
          getPopupContainer={popupContainer}
          size="large"
        />
      </Col>

      <Col>
        <Select
          placeholder="Model"
          style={{ width: 250 }}
          getPopupContainer={popupContainer}
          size="large"
        />
      </Col>

      <Col>
        <Select
          placeholder="Background"
          style={{ width: 250 }}
          getPopupContainer={popupContainer}
          size="large"
        />
      </Col>

      <Col>
        <Select
          placeholder="Symbol"
          style={{ width: 250 }}
          getPopupContainer={popupContainer}
          size="large"
        />
      </Col>

      <Col>
        <Dropdown
          trigger={['click']}
          getPopupContainer={popupContainer}
          menu={{ items: [{ key: '1', label: 'Test' }] }}
        >
          <Button icon={<FilterOutlined />} size="large"/>
        </Dropdown>
      </Col>
    </Row>
  );
};


export default FilterBar;
