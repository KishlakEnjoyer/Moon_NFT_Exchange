import { Dropdown, MenuProps, message, Spin } from "antd";
import { useEffect, useState } from "react";
import { CheckOutlined, EyeOutlined, EyeInvisibleOutlined, FolderOpenOutlined } from "@ant-design/icons";
import { togglePresentVisibility } from "../services/presentService";
import { addPresentToAlbum, removePresentFromAlbum, Album } from "../services/albumService";
import { authFetch } from "../services/auth";
import { useTranslation } from "react-i18next";

interface PresentCardContextMenuProps {
  presentId: number;
  userId: number;
  isOwner: boolean;
  isVisible: boolean;
  albums: Album[];
  activeAlbumId: number | null;
  onRefresh: () => void;
  children: React.ReactNode;
}

const PresentCardContextMenu = ({ presentId, userId, isOwner, isVisible, albums, activeAlbumId, onRefresh, children }: PresentCardContextMenuProps) => {
  const { t } = useTranslation();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [presentAlbumIds, setPresentAlbumIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isOwner) return;
    setLoading(true);
    authFetch(`${process.env.REACT_APP_API_URL}/albums/${userId}/presents`)
      .then(r => r.json())
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        const ids = arr
          .filter((pa: any) => pa.present_id === presentId)
          .map((pa: any) => pa.album_id);
        setPresentAlbumIds(ids);
      })
      .catch(() => setPresentAlbumIds([]))
      .finally(() => setLoading(false));
  }, [isOwner, userId, presentId, refreshKey]);

  const handleToggleVisibility = async () => {
    try {
      await togglePresentVisibility(presentId, userId);
      onRefresh();
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      messageApi.error(e.message || t("presentMenu.failed"));
    }
  };

  const handleToggleAlbum = async (albumId: number) => {
    try {
      if (presentAlbumIds.includes(albumId)) {
        await removePresentFromAlbum(albumId, presentId);
        setPresentAlbumIds(prev => prev.filter(id => id !== albumId));
      } else {
        await addPresentToAlbum(albumId, presentId);
        setPresentAlbumIds(prev => [...prev, albumId]);
      }
      onRefresh();
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      messageApi.error(e.message || t("presentMenu.failed"));
    }
  };

  const albumItems: MenuProps["items"] = albums.map(album => ({
    key: `album_${album.album_id}`,
    label: (
      <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
        {album.album_title}
        {presentAlbumIds.includes(album.album_id) && <CheckOutlined style={{ color: "var(--color-primary)" }} />}
      </span>
    ),
    onClick: () => handleToggleAlbum(album.album_id),
  }));

  const isInActiveAlbum = activeAlbumId !== null && presentAlbumIds.includes(activeAlbumId);

  const items: MenuProps["items"] = [
    {
      key: "albums",
      label: (
        <Dropdown
          menu={{ items: albumItems }}
          trigger={["click"]}
          placement="topRight"
          styles={{ root: { minWidth: 180 } }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
            <FolderOpenOutlined /> {t("presentMenu.addToAlbum")}
          </span>
        </Dropdown>
      ),
    },
    ...(isInActiveAlbum ? [{
      key: "remove_from_album",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#ff4d4f" }}>
          {t("presentMenu.removeFromAlbum")}
        </span>
      ),
      onClick: () => {
        removePresentFromAlbum(activeAlbumId, presentId)
          .then(() => {
            setPresentAlbumIds(prev => prev.filter(id => id !== activeAlbumId));
            messageApi.success(t("presentMenu.removedFromAlbum"));
            onRefresh();
            setRefreshKey(k => k + 1);
          })
          .catch((e: any) => messageApi.error(e.message || t("presentMenu.failed")));
      },
    }] : []),
    { type: "divider" },
    {
      key: "visibility",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          {isVisible ? t("presentMenu.hideFromProfile") : t("presentMenu.showOnProfile")}
        </span>
      ),
      onClick: handleToggleVisibility,
    },
  ];

  if (!isOwner) return <>{children}</>;

  return (
    <>
      {messageContextHolder}
      <Dropdown menu={{ items }} trigger={["contextMenu"]}>
        <div style={{ position: "relative" }}>
          {loading && (
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 10 }}>
              <Spin size="small" />
            </div>
          )}
          {children}
        </div>
      </Dropdown>
    </>
  );
};

export default PresentCardContextMenu;
