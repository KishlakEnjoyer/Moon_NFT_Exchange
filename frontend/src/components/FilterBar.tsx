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
  return (
    <Row gutter={[12, 12]} align="middle">
      <Col flex="auto">
        <Input.Search placeholder="Search" allowClear />
      </Col>

      <Col>
        <Select placeholder="Collection" style={{ width: 250 }} />
      </Col>
      <Col>
        <Select placeholder="Model" style={{ width: 250 }} />
      </Col>
      <Col>
        <Select placeholder="Background" style={{ width: 250 }} />
      </Col>
      <Col>
        <Select placeholder="Symbol" style={{ width: 250 }} />
      </Col>

      <Col>
        <Dropdown menu={{ items: [{ key: '1', label: 'Test' }] }}
      trigger={['click']}>
          <Button icon={<FilterOutlined/>}/>
        </Dropdown>
      </Col>
    </Row>
  );
};

export default FilterBar;
