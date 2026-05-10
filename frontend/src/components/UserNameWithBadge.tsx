import { TrophyOutlined } from "@ant-design/icons";
import { Avatar, Flex, Tooltip, Typography } from "antd";
import type { MouseEventHandler, ReactNode } from "react";

const { Text } = Typography;

const IMAGES_URL = process.env.REACT_APP_IMAGES_URL || "";

export const getAchievementBadgeUrl = (imageUrl: string | null | undefined): string | undefined => {
  if (!imageUrl) return undefined;
  if (/^(https?:)?\/\//i.test(imageUrl) || imageUrl.startsWith("/")) return imageUrl;
  return `${IMAGES_URL}/achievements/${imageUrl}`;
};

interface UserNameWithBadgeProps {
  username?: string | null;
  fallback?: ReactNode;
  badgeImageUrl?: string | null;
  badgeTitle?: string | null;
  badgeId?: number | null;
  strong?: boolean;
  badgeSize?: number;
  className?: string;
  textClassName?: string;
  textColorClassName?: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

const UserNameWithBadge = ({
  username,
  fallback,
  badgeImageUrl,
  badgeTitle,
  badgeId,
  strong,
  badgeSize = 18,
  className,
  textClassName,
  textColorClassName,
  onClick,
}: UserNameWithBadgeProps) => {
  const label = username || fallback;
  const hasBadge = Boolean(badgeId || badgeImageUrl || badgeTitle);
  const badgeSrc = getAchievementBadgeUrl(badgeImageUrl);

  return (
    <Flex
      align="center"
      gap={4}
      className={`min-w-0 ${onClick ? "cursor-pointer hover:opacity-75 transition-opacity" : ""} ${className || ""}`}
      style={{ display: "inline-flex" }}
      onClick={onClick}
    >
      <Text
        strong={strong}
        ellipsis={typeof label === "string" ? { tooltip: label } : undefined}
        className={`min-w-0 ${textColorClassName || ""} ${textClassName || ""}`}
      >
        {label}
      </Text>
      {hasBadge && (
        <Tooltip title={badgeTitle || undefined}>
          <Avatar
            shape="square"
            size={badgeSize}
            src={badgeSrc ? (
              <img
                src={badgeSrc}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : undefined}
            icon={!badgeSrc ? <TrophyOutlined /> : undefined}
            className="shrink-0 bg-transparent"
            style={{ border: 0 }}
          />
        </Tooltip>
      )}
    </Flex>
  );
};

export default UserNameWithBadge;
