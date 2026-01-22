import { Header } from "antd/es/layout/layout";
import { Badge, Button, Divider, Dropdown, Flex, Image, MenuProps } from "antd";
import Title from "antd/es/typography/Title";
import { useNavigate } from "react-router-dom";
import "../styles/HeaderStyle.css";

import IconSwitch from "./SwitchTheme";
import { useState } from "react";
import { BellOutlined, LogoutOutlined, SettingOutlined, ShoppingCartOutlined, UsergroupAddOutlined, UserOutlined } from "@ant-design/icons";
import TONIcon from "./icons/TONIcon";

interface MainHeaderProps {
  darkMode: boolean;
  onThemeChange: (checked: boolean) => void;
}

const MainHeader: React.FC<MainHeaderProps> = ({ darkMode, onThemeChange }) => {
  const navigate = useNavigate(); 

  const [isAuthenticated, setIsAuthenticated] = useState(true);

  const handleConnectClick = () => {
    navigate("/account"); 
  };
  const handleHomeClick = () => {
    navigate("/"); 
  };

  const currentUser = {
    nickname: 'KishlakEnjoyer',
    balance: 3.02

  };

  const menuItems: MenuProps['items'] = [
    {
      key: '1',
      label: 'Профиль',
      icon: <UserOutlined />,
    },
    {
      key: '2',
      label: 'Настройки',
      icon: <SettingOutlined />,
    },
    {
      key: '3',
      label: 'Выход',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: () => setIsAuthenticated(false),
    },
  ];
  return (
    <Header className="header-container">
      <div className="logo" onClick={handleHomeClick}>
        <svg
          width="69"
          height="64"
          viewBox="0 0 69 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M30.21 17.6309C30.3356 17.7786 30.4682 17.9233 30.6084 18.0635C31.1952 18.6503 31.8542 19.1106 32.542 19.4394L29.9326 18.7402L22.4316 20.75L29.9326 22.7598L35.2021 21.3476C35.5489 21.6264 35.9354 21.8711 36.3545 22.0742L31.8643 23.2773L39.3652 25.2871L46.8672 23.2773L42.377 22.0742C42.7961 21.8712 43.1826 21.6263 43.5293 21.3476L48.7988 22.7598L56.2998 20.75L48.7988 18.7402L47.2988 19.1416C47.786 18.8505 48.2522 18.4909 48.6797 18.0635C48.7812 17.9619 48.8778 17.8566 48.9717 17.751L58.3613 20.2676L58.7324 20.3672V29.1338L58.3613 29.2334L56.8662 29.6338V44.2392C56.535 44.3148 56.2017 44.3857 55.8662 44.4512V29.9014L48.9287 31.7607L48.3662 31.9111V45.0273C48.0318 45.014 47.6984 44.9963 47.3662 44.9726V32.1787L39.8662 34.1885V43.5215C39.5308 43.4137 39.1971 43.3021 38.8662 43.1836V34.1885L31.3662 32.1787V39.3262C31.028 39.0921 30.6953 38.8502 30.3662 38.6035V31.9111L29.8037 31.7607L22.8662 29.9014V30.7148C22.3829 29.9971 21.9262 29.2588 21.499 28.5L22.4951 28.7676L29.4326 30.626V23.6611L21 21.4014V27.583C20.6429 26.8981 20.3097 26.1976 20 25.4834V20.3672L20.3701 20.2676L29.8037 17.7402L30.21 17.6309ZM30.4326 30.8935L30.9951 31.0449L38.8662 33.1533V26.1885L30.4326 23.9287V30.8935ZM39.8662 26.1885V33.1533L47.7363 31.0449L48.2988 30.8935V23.9287L39.8662 26.1885ZM49.2988 23.6611V30.626L56.2363 28.7676L57.7324 28.3662V21.4014L49.2988 23.6611ZM39.3662 13.75C42.1276 13.75 44.3662 15.5409 44.3662 17.75C44.366 19.959 42.1275 21.75 39.3662 21.75C36.6051 21.7498 34.3664 19.9589 34.3662 17.75C34.3662 15.541 36.605 13.7502 39.3662 13.75ZM39.3662 14.75C36.9375 14.7502 35.3662 16.2899 35.3662 17.75C35.3664 19.21 36.9377 20.7498 39.3662 20.75C41.795 20.75 43.366 19.2101 43.3662 17.75C43.3662 16.2898 41.7951 14.75 39.3662 14.75ZM42.3164 11.6992C44.2688 9.74701 47.1176 9.43064 48.6797 10.9922C50.2418 12.5543 49.9253 15.4038 47.9727 17.3564C47.1515 18.1775 46.1711 18.7073 45.1953 18.9316C45.2962 18.5848 45.3532 18.2244 45.3623 17.8535C46.0085 17.6398 46.6667 17.2482 47.2656 16.6494C48.9831 14.9319 49.0051 12.7317 47.9727 11.6992C46.94 10.6672 44.7407 10.6893 43.0234 12.4062C42.7152 12.7145 42.4605 13.0383 42.2578 13.3682C41.9567 13.2299 41.6394 13.1126 41.3096 13.0185C41.5723 12.553 41.9091 12.1065 42.3164 11.6992ZM30.6094 10.9922C32.1715 9.43035 35.0211 9.74679 36.9736 11.6992C37.3456 12.0712 37.6576 12.4765 37.9092 12.8984C37.5644 12.9702 37.2314 13.0675 36.9131 13.1865C36.7324 12.9198 36.5178 12.6575 36.2666 12.4062C34.5492 10.689 32.349 10.667 31.3164 11.6992C30.284 12.7317 30.3061 14.932 32.0234 16.6494C32.4507 17.0767 32.9085 17.3987 33.3701 17.626C33.3689 17.6671 33.3672 17.7086 33.3672 17.75C33.3672 18.0935 33.4091 18.4289 33.4883 18.7529C32.719 18.4746 31.9673 18.0073 31.3164 17.3564C29.3639 15.4039 29.0474 12.5543 30.6094 10.9922Z"
            fill="#1689FE"
          />
          <path
            d="M9.56367 0.736035C11.199 -1.11188 13.9581 0.815568 13.5378 3.25104L13.4328 3.89536C12.9325 7.12666 12.8422 10.4764 13.2132 13.8823C15.4865 34.7543 34.1904 49.8251 54.9894 47.5439C58.6104 47.1468 62.0555 46.2487 65.2649 44.9271C67.5437 43.9887 70.0148 46.2764 68.5695 48.2781L67.9918 49.0565C61.9198 57.0319 52.7312 62.5952 42.0036 63.7717C21.2047 66.0526 2.50063 50.9821 0.227433 30.1101C-0.94482 19.3463 2.48294 9.14309 8.92996 1.47138L9.56367 0.736035ZM11.0376 1.22946C10.8861 1.2424 10.6912 1.30943 10.4778 1.55042C3.84267 9.05095 0.271323 19.2246 1.44235 29.9772C3.64237 50.1757 21.7432 64.7599 41.8711 62.5526C52.5871 61.3772 61.7154 55.6806 67.5801 47.5583C67.7687 47.2972 67.7923 47.0915 67.7723 46.9403C67.7497 46.7707 67.6565 46.5685 67.462 46.3787C67.0608 45.9873 66.3832 45.7932 65.7291 46.0625C62.415 47.4271 58.8579 48.3533 55.1218 48.7631C33.652 51.1177 14.345 35.5604 11.9983 14.0153C11.5901 10.2671 11.7225 6.58279 12.3336 3.04146C12.4542 2.34237 12.1176 1.72004 11.6498 1.41149C11.4232 1.26222 11.2074 1.215 11.0376 1.22946Z"
            fill="white"
          />
          <path
            d="M7.5 14.5C8.71445 14.5 9.5 15.2699 9.5 16C9.5 16.7301 8.71445 17.5 7.5 17.5C6.28555 17.5 5.5 16.7301 5.5 16C5.5 15.2699 6.28555 14.5 7.5 14.5Z"
            stroke="white"
          />
          <path
            d="M17.5 46.5C18.7145 46.5 19.5 47.2699 19.5 48C19.5 48.7301 18.7145 49.5 17.5 49.5C16.2855 49.5 15.5 48.7301 15.5 48C15.5 47.2699 16.2855 46.5 17.5 46.5Z"
            stroke="white"
          />
          <path
            d="M13.5 33.5C16.3073 33.5 18.5 35.5585 18.5 38C18.5 40.4415 16.3073 42.5 13.5 42.5C10.6927 42.5 8.5 40.4415 8.5 38C8.5 35.5585 10.6927 33.5 13.5 33.5Z"
            stroke="white"
          />
          <path
            d="M27 47.5C28.9978 47.5 30.5 48.9038 30.5 50.5C30.5 52.0962 28.9978 53.5 27 53.5C25.0022 53.5 23.5 52.0962 23.5 50.5C23.5 48.9038 25.0022 47.5 27 47.5Z"
            stroke="white"
          />
          <circle cx="7" cy="28" r="3.5" stroke="white" />
          <path
            d="M48 52.5C48.7301 52.5 49.5 53.2855 49.5 54.5C49.5 55.7145 48.7301 56.5 48 56.5C47.2699 56.5 46.5 55.7145 46.5 54.5C46.5 53.2855 47.2699 52.5 48 52.5Z"
            stroke="white"
          />
          <path
            d="M36.5 55.5C37.5231 55.5 38.5 56.5301 38.5 58C38.5 59.4699 37.5231 60.5 36.5 60.5C35.4769 60.5 34.5 59.4699 34.5 58C34.5 56.5301 35.4769 55.5 36.5 55.5Z"
            stroke="white"
          />
        </svg>

        <Title level={1} className="header-title">
          Moon
        </Title>
      </div>
      <div className="right-part">
        <IconSwitch darkMode={darkMode} onThemeChange={onThemeChange}/>
        {!isAuthenticated && (
          <Button
            color="default"
            variant="outlined"
            size="large"
            onClick={handleConnectClick}
          >
            Connect TG
            <Image
              src="/icons/tg-icon-png.png"
              alt="TgIcon"
              style={{ width: "20px", marginLeft: "8px" }}
              preview={false}
            />
          </Button>
        )}

        {isAuthenticated && (
          <div className="authed-header">
            <Badge count={5} >
              <Button type="text" 
              icon={<BellOutlined style={{ fontSize: 'var(--size-lg)', color: 'var(--white-100)' }} />} 
              size="large"/>
            </Badge>

            <Button type="text" icon={<UsergroupAddOutlined />} 
            style={{ fontSize: 'var(--size-lg)', color: 'var(--white-100)' }}
            size="large" />

            <Button type="text" icon={<ShoppingCartOutlined />}
            style={{ fontSize: 'var(--size-lg)', color: 'var(--white-100)' }}
            size="large"/>

            <Flex className="balance-badge" orientation="horizontal"
            style={{ fontSize: 'var(--size-lg)', color: 'var(--white-100)' }}>
              <TONIcon/>
              {currentUser.balance}
              <Button className="popup-balance" style={{ fontSize: 'var(--size-lg)', color: 'var(--white-100)' }}>
                +
              </Button>
            </Flex>

            <Dropdown menu={{ items: menuItems }} trigger={['click']}>
              <Button type="text" className="username-btn" style={{ fontSize: 'var(--size-lg)', color: 'var(--white-100)', fontWeight: 'var(--font-bold)' }}>
                {currentUser.nickname}
              </Button>
            </Dropdown>
          </div>
        )}
      </div>
    </Header>
  );
};

export default MainHeader;
