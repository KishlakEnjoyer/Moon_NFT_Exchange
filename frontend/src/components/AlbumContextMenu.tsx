import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import type { ReactNode } from "react";

interface AlbumContextMenuProps {
  children: ReactNode;
  disabled?: boolean;
  onDelete: () => void;
  onRename: () => void;
}

const AlbumContextMenu = ({
  children,
  disabled = false,
  onDelete,
  onRename,
}: AlbumContextMenuProps) => {
  const items: MenuProps["items"] = [
    {
      key: "rename",
      icon: <EditOutlined />,
      label: "Rename",
    },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "Delete",
      danger: true,
    },
  ];

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "rename") {
      onRename();
    }

    if (key === "delete") {
      onDelete();
    }
  };

  return (
    <Dropdown
      disabled={disabled}
      menu={{ items, onClick: handleMenuClick }}
      trigger={["contextMenu"]}
    >
      <span
        onContextMenu={(event) => event.preventDefault()}
        style={{ display: "inline-flex", alignItems: "center" }}
      >
        {children}
      </span>
    </Dropdown>
  );
};

export default AlbumContextMenu;
