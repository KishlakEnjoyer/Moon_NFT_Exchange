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
    <Row gutter={[12, 12]} align="middle" 
          style={{ width: '100%' }}
    >
      <Col flex="auto" >
        <Input.Search placeholder="Search"
                      allowClear
                      size="large"
                      style={{ width: '100%' }}
                      />
      </Col>

      <Col flex="auto">
        <Select
          placeholder="Collection"
          style={{ width: '100%' }}
          getPopupContainer={popupContainer}
          size="large"
        />
      </Col>

      <Col flex="auto">
        <Select
          placeholder="Model"
          style={{ width: '100%' }}
          getPopupContainer={popupContainer}
          size="large"
        />
      </Col>

      <Col flex="auto">
        <Select
          placeholder="Background"
          style={{ width: '100%' }}
          getPopupContainer={popupContainer}
          size="large"
        />
      </Col>

      <Col flex="auto">
        <Select
          placeholder="Symbol"
          style={{ width: '100%' }}
          getPopupContainer={popupContainer}
          size="large"
        />
      </Col>

      <Col style={{ maxWidth: '40px'}}>
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
