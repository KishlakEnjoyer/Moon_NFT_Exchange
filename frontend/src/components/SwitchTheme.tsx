import { Switch } from 'antd';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useState } from 'react';
import "../styles/SwitchThemeStyle.css";

interface IconSwitchProps {
  darkMode: boolean;
  onThemeChange: (checked: boolean) => void;
}

const IconSwitch: React.FC<IconSwitchProps> = ({ darkMode, onThemeChange }) => {

  return (
    <Switch
      size='default'
      checked={darkMode}
      onChange={onThemeChange}
      checkedChildren={<MoonOutlined />}
      unCheckedChildren={<SunOutlined />}
      className="icon-switch"
    />
  );
};

export default IconSwitch;
