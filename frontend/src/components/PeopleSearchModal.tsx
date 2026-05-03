import { UserOutlined } from "@ant-design/icons";
import { Avatar, Flex, Input, Modal, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const { Text, Title } = Typography;

interface UserOption {
  user_id: number;
  username: string;
  profile_pic_url: string | null;
  is_active: number;
}

interface PeopleSearchModalProps {
  open: boolean;
  onClose: () => void;
  currentUserId?: number;
}

const PeopleSearchModal = ({ open, onClose, currentUserId }: PeopleSearchModalProps) => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const loadUsers = (query: string) => {
    fetch(`${process.env.REACT_APP_API_URL}/user-info/search?q=${encodeURIComponent(query)}`)
      .then((res) => {
        if (res.ok) return res.json();
        return [];
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setUsers(data.filter((u: any) => u.user_id !== currentUserId));
        }
      })
      .catch(() => setUsers([]));
  };

  useEffect(() => {
    if (!open) return;
    setSearchQuery("");
    loadUsers("");
  }, [open, currentUserId]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => loadUsers(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, open, currentUserId]);

  const handleUserClick = (username: string) => {
    onClose();
    navigate(`/account/${username}`);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="min(480px, calc(100vw - 24px))"
      title={<Title level={4} className="!mb-0">{t("people.title")}</Title>}
    >
      <Flex vertical gap={16} className="mt-4">
        <Input.Search
          placeholder={t("people.search")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
        />
        <Flex vertical gap={8} className="max-h-80 overflow-y-auto moon-mobile-scroll">
          {users.map((user) => (
            <Flex
              key={user.user_id}
              align="center"
              gap={12}
              className="min-w-0 cursor-pointer rounded-[var(--size-smm)] p-3 hover:bg-[var(--black-transparent-05)] transition-colors"
              onClick={() => handleUserClick(user.username)}
            >
              <Avatar
                size={40}
                src={user.is_active === 0 || !user.profile_pic_url ? undefined : `${process.env.REACT_APP_IMAGES_URL}/pfps/${user.profile_pic_url}`}
                icon={user.is_active === 0 || !user.profile_pic_url ? <UserOutlined /> : undefined}
              />
              <Flex vertical className="min-w-0">
                <Text strong ellipsis={{ tooltip: user.username }} className="min-w-0">{user.username}</Text>
                {user.is_active === 0 && <Tag color="red" className="w-fit">Аккаунт заблокирован</Tag>}
              </Flex>
            </Flex>
          ))}
          {users.length === 0 && searchQuery === "" && (
            <Text type="secondary" className="text-center py-4">
              {t("people.startTyping")}
            </Text>
          )}
          {users.length === 0 && searchQuery !== "" && (
            <Text type="secondary" className="text-center py-4">
              {t("people.noUsers")}
            </Text>
          )}
        </Flex>
      </Flex>
    </Modal>
  );
};

export default PeopleSearchModal;
