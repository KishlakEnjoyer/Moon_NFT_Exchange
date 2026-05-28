import { Modal, Flex, Typography, Image, Button, Avatar, Tag, message, Popconfirm, InputNumber } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  RightOutlined,
  CheckOutlined,
  FireOutlined,
  TagOutlined,
  StopOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  PresentDetail,
  cancelListing,
  createListing,
  getPriceEstimate,
  getPresentDetail,
  getPresentDisplayImageUrl,
  togglePresentVisibility,
  upgradePresent,
} from "../services/presentService";
import { authFetch } from "../services/auth";
import { buyListing, recordListingView } from "../services/listingService";
import { useTranslation } from "react-i18next";
import UserNameWithBadge from "./UserNameWithBadge";
import { getLocalizedErrorMessage } from "../utils/localizedError";

const { Text, Title } = Typography;

const API_URL = process.env.REACT_APP_API_URL;
const IMAGES_URL = process.env.REACT_APP_IMAGES_URL;
const MAX_LISTING_PRICE = 100000;

type RouletteOption = {
  id: number;
  name: string;
  image_url?: string | null;
};

const normalizeRouletteOptions = (items: any[]): RouletteOption[] => (
  items
    .map((item) => ({
      id: Number(item.id ?? item.model_id ?? item.background_id),
      name: String(item.name ?? item.model_name ?? item.background_name ?? ""),
      image_url: item.image_url ?? item.model_image_url ?? item.background_image_url ?? null,
    }))
    .filter((item) => Number.isFinite(item.id) && item.name)
);

interface GiftDetailModalProps {
  open: boolean;
  presentId: number | null;
  userId: number;
  canManage?: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const withExtension = (value: string, extension: string) => (
  /\.[a-z0-9]+$/i.test(value) ? value : `${value}.${extension}`
);

const getAssetUrl = (
  folder: "models" | "bgs",
  imageUrl?: string | null,
) => {
  if (!imageUrl) return undefined;

  if (
    /^(https?:)?\/\//i.test(imageUrl)
    || imageUrl.startsWith("/")
    || imageUrl.startsWith("data:")
  ) {
    return imageUrl;
  }

  const extension = folder === "bgs" ? "png" : "webp";
  return `${IMAGES_URL}/${folder}/${withExtension(imageUrl, extension)}`;
};

const pickRandom = <T,>(items: T[]): T | null => (
  items.length ? items[Math.floor(Math.random() * items.length)] : null
);

const GiftDetailModal = ({
  open,
  presentId,
  userId,
  canManage = false,
  onClose,
  onRefresh,
}: GiftDetailModalProps) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [detail, setDetail] = useState<PresentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isListingFormOpen, setIsListingFormOpen] = useState(false);
  const [listingPrice, setListingPrice] = useState<number | null>(null);
  const [recommendedPrice, setRecommendedPrice] = useState<number | null>(null);
  const [priceEstimateLoading, setPriceEstimateLoading] = useState(false);

  const [rouletteOpen, setRouletteOpen] = useState(false);
  const [rouletteFinished, setRouletteFinished] = useState(false);
  const [rouletteCanSkip, setRouletteCanSkip] = useState(false);
  const [rouletteFinalDetail, setRouletteFinalDetail] = useState<PresentDetail | null>(null);
  const [rouletteUpgradePrice, setRouletteUpgradePrice] = useState<string | null>(null);

  const [modelOptions, setModelOptions] = useState<RouletteOption[]>([]);
  const [backgroundOptions, setBackgroundOptions] = useState<RouletteOption[]>([]);
  const [rouletteModel, setRouletteModel] = useState<RouletteOption | null>(null);
  const [rouletteBackground, setRouletteBackground] = useState<RouletteOption | null>(null);

  const rouletteTimerRef = useRef<number | null>(null);
  const rouletteSkipTimerRef = useRef<number | null>(null);
  const rouletteFinishedRef = useRef(false);

  const navigate = useNavigate();

  const clearRouletteTimers = useCallback(() => {
    if (rouletteTimerRef.current) {
      window.clearTimeout(rouletteTimerRef.current);
      rouletteTimerRef.current = null;
    }

    if (rouletteSkipTimerRef.current) {
      window.clearTimeout(rouletteSkipTimerRef.current);
      rouletteSkipTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open || !presentId) return;

    clearRouletteTimers();

    setLoading(true);
    setDetail(null);
    setIsListingFormOpen(false);
    setListingPrice(null);
    setRecommendedPrice(null);
    setPriceEstimateLoading(false);

    setRouletteOpen(false);
    setRouletteFinished(false);
    setRouletteCanSkip(false);
    setRouletteFinalDetail(null);
    setRouletteUpgradePrice(null);
    setModelOptions([]);
    setBackgroundOptions([]);
    setRouletteModel(null);
    setRouletteBackground(null);
    rouletteFinishedRef.current = false;

    getPresentDetail(presentId)
      .then((data) => setDetail(data))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [open, presentId, clearRouletteTimers]);

  useEffect(() => {
    return () => clearRouletteTimers();
  }, [clearRouletteTimers]);

  useEffect(() => {
    if (!open || canManage || !detail?.active_listing_id) {
      return;
    }

    recordListingView(detail.active_listing_id).catch((error) => {
      console.error("Failed to record listing view:", error);
    });
  }, [open, canManage, detail?.active_listing_id]);

  const finishRoulette = useCallback(() => {
    if (!rouletteFinalDetail || rouletteFinishedRef.current) return;

    rouletteFinishedRef.current = true;
    clearRouletteTimers();

    const finalModel = modelOptions.find(
      (model) => model.name === rouletteFinalDetail.model_name,
    );

    const finalBackground = backgroundOptions.find(
      (background) => background.name === rouletteFinalDetail.background_name,
    );

    if (finalModel) {
      setRouletteModel(finalModel);
    }

    if (finalBackground) {
      setRouletteBackground(finalBackground);
    }

    setRouletteFinished(true);
    setRouletteCanSkip(false);
    setDetail(rouletteFinalDetail);
    onRefresh();

    messageApi.success(
      t("giftDetail.upgradedPaid", {
        amount: parseFloat(rouletteUpgradePrice || "0").toFixed(2),
      }),
    );
  }, [
    rouletteFinalDetail,
    clearRouletteTimers,
    onRefresh,
    messageApi,
    t,
    rouletteUpgradePrice,
    modelOptions,
    backgroundOptions,
  ]);

  useEffect(() => {
    if (!rouletteOpen || !rouletteFinalDetail || rouletteFinished) return;

    rouletteFinishedRef.current = false;

    const startedAt = Date.now();
    const durationMs = 5000;

    rouletteSkipTimerRef.current = window.setTimeout(() => {
      setRouletteCanSkip(true);
    }, 700);

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(elapsed / durationMs, 1);

      if (progress >= 1) {
        finishRoulette();
        return;
      }

      setRouletteModel(pickRandom(modelOptions));
      setRouletteBackground(pickRandom(backgroundOptions));

      const delay = 55 + Math.floor(progress * progress * 330);
      rouletteTimerRef.current = window.setTimeout(tick, delay);
    };

    tick();

    return () => clearRouletteTimers();
  }, [
    rouletteOpen,
    rouletteFinalDetail,
    rouletteFinished,
    modelOptions,
    backgroundOptions,
    finishRoulette,
    clearRouletteTimers,
  ]);

  if (!detail && !loading) return null;

  const handleClose = () => {
    if (rouletteOpen && !rouletteFinished) return;
    onClose();
  };

  const handleToggleVisibility = async () => {
    if (!detail) return;

    try {
      await togglePresentVisibility(detail.present_id, userId);
      setDetail({ ...detail, is_visible: detail.is_visible === 1 ? 0 : 1 });
      onRefresh();
    } catch (e: any) {
      messageApi.error(getLocalizedErrorMessage(e, t, "giftDetail.failedToggleVisibility"));
    }
  };

  const handleBurn = async () => {
    if (!detail) return;

    setSubmitting(true);

    try {
      const res = await authFetch(`${API_URL}/presents/${detail.present_id}/burn?user_id=${userId}`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || t("giftDetail.burnFailed"));
      }

      const data = await res.json();

      messageApi.success(
        t("giftDetail.burnedReceived", {
          amount: parseFloat(data.refund_amount).toFixed(2),
        }),
      );

      setDetail({ ...detail, is_burned: true });
      onRefresh();
    } catch (e: any) {
      messageApi.error(getLocalizedErrorMessage(e, t, "giftDetail.failedBurn"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpgrade = async () => {
    if (!detail) return;

    setSubmitting(true);

    try {
      const collectionId = Number((detail as any).collection_id);

      if (!collectionId) {
        throw new Error(t("giftDetail.missingCollectionForUpgrade"));
      }

      const [modelsRes, backgroundsRes] = await Promise.all([
        fetch(`${API_URL}/api/filters/models?collection_ids=${collectionId}`),
        fetch(`${API_URL}/api/filters/backgrounds`),
      ]);

      if (!modelsRes.ok) {
        throw new Error(t("giftDetail.failedLoadRouletteModels"));
      }

      if (!backgroundsRes.ok) {
        throw new Error(t("giftDetail.failedLoadRouletteBackgrounds"));
      }

      const [modelsData, backgroundsData] = await Promise.all([
        modelsRes.json(),
        backgroundsRes.json(),
      ]);

      const models = normalizeRouletteOptions(Array.isArray(modelsData) ? modelsData : []);
      const backgrounds = normalizeRouletteOptions(Array.isArray(backgroundsData) ? backgroundsData : []);

      console.log("ROULETTE MODELS", models);
      console.log("ROULETTE BACKGROUNDS", backgrounds);

      if (models.length === 0) {
        throw new Error(t("giftDetail.noRouletteModels"));
      }

      setModelOptions(models);
      setBackgroundOptions(backgrounds);

      setRouletteModel(pickRandom(models));
      setRouletteBackground(pickRandom(backgrounds));

      const data = await upgradePresent(detail.present_id, userId);
      const refreshed = await getPresentDetail(detail.present_id);

      setRouletteFinalDetail(refreshed);
      setRouletteUpgradePrice(data.price);
      setRouletteFinished(false);
      setRouletteCanSkip(false);
      setRouletteOpen(true);
      rouletteFinishedRef.current = false;

      try {
        const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");

        if (currentUser.user_id === userId) {
          localStorage.setItem(
            "currentUser",
            JSON.stringify({ ...currentUser, balance: parseFloat(data.new_balance) }),
          );
          window.dispatchEvent(new Event("storage"));
        }
      } catch {
      }
    } catch (e: any) {
      messageApi.error(getLocalizedErrorMessage(e, t, "giftDetail.failedUpgrade"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateListing = async () => {
    if (!detail) return;

    if (!listingPrice || listingPrice <= 0) {
      messageApi.error(t("giftDetail.enterValidPrice"));
      return;
    }

    if (listingPrice > MAX_LISTING_PRICE) {
      messageApi.error(t("giftDetail.maxListingPrice", { price: MAX_LISTING_PRICE }));
      return;
    }

    setSubmitting(true);

    try {
      const listing = await createListing(detail.present_id, userId, listingPrice.toFixed(2));

      setDetail({
        ...detail,
        is_on_sale: true,
        active_listing_id: listing.listing_id,
        active_listing_price: listing.price,
      });

      setIsListingFormOpen(false);
      setListingPrice(null);
      onRefresh();
      messageApi.success(t("giftDetail.giftListed"));
    } catch (e: any) {
      messageApi.error(getLocalizedErrorMessage(e, t, "giftDetail.failedCreateListing"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBuyListing = async () => {
    if (!detail?.active_listing_id) return;

    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");

    if (!currentUser.user_id) {
      messageApi.error(t("giftDetail.loginToBuy"));
      return;
    }

    setSubmitting(true);

    try {
      const result = await buyListing(detail.active_listing_id);

      if (result.new_balance) {
        localStorage.setItem(
          "currentUser",
          JSON.stringify({ ...currentUser, balance: parseFloat(result.new_balance) }),
        );
        window.dispatchEvent(new Event("storage"));
      }

      window.dispatchEvent(new Event("listingsChanged"));
      onRefresh();
      onClose();

      messageApi.success(
        t("giftDetail.purchasedFor", {
          price: parseFloat(result.price).toFixed(2),
        }),
      );
    } catch (e: any) {
      messageApi.error(getLocalizedErrorMessage(e, t, "giftDetail.failedBuyGift"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenListingForm = async () => {
    if (!detail) return;

    setIsListingFormOpen(true);
    setRecommendedPrice(null);
    setPriceEstimateLoading(true);

    try {
      const estimate = await getPriceEstimate(detail.present_id);
      const avgPrice = Number(estimate.avg_price);

      if (Number.isFinite(avgPrice) && avgPrice > 0) {
        const roundedAvgPrice = Number(avgPrice.toFixed(2));
        setRecommendedPrice(roundedAvgPrice);
        setListingPrice((currentPrice) => currentPrice ?? roundedAvgPrice);
      }
    } catch (e: any) {
      messageApi.warning(getLocalizedErrorMessage(e, t, "giftDetail.failedRecommendedPrice"));
    } finally {
      setPriceEstimateLoading(false);
    }
  };

  const handleCancelListing = async () => {
    if (!detail) return;

    setSubmitting(true);

    try {
      await cancelListing(detail.present_id);

      setDetail({
        ...detail,
        is_on_sale: false,
        active_listing_id: null,
        active_listing_price: null,
      });

      onRefresh();
      messageApi.success(t("giftDetail.giftRemoved"));
    } catch (e: any) {
      messageApi.error(getLocalizedErrorMessage(e, t, "giftDetail.failedRemoveListing"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOwnerClick = () => {
    if (rouletteOpen && !rouletteFinished) return;

    if (detail?.owner_username) {
      onClose();
      navigate(`/account/${detail.owner_username}`);
    }
  };

  const handleSenderClick = () => {
    if (rouletteOpen && !rouletteFinished) return;

    if (detail?.original_sender_username) {
      onClose();
      navigate(`/account/${detail.original_sender_username}`);
    }
  };

  const basePrice = parseFloat(detail?.base_price || "0");
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const currentUserBlocked = currentUser.is_active === 0;

  const activeListingPrice = detail?.active_listing_price
    ? parseFloat(detail.active_listing_price)
    : null;

  const activeListingPriceLabel = activeListingPrice !== null && Number.isFinite(activeListingPrice)
    ? activeListingPrice.toFixed(2)
    : "0.00";

  const burnRefundPercent = parseFloat(process.env.REACT_APP_BURN_REFUND_PERCENT || "75");
  const upgradePercent = parseFloat(process.env.REACT_APP_UPGRADE_PERCENT || "25");
  const burnRefundAmount = (basePrice * burnRefundPercent / 100).toFixed(2);
  const upgradePriceAmount = (basePrice * upgradePercent / 100).toFixed(2);

  const ownerAvatarUrl = detail?.owner_profile_pic_url
    ? `${IMAGES_URL}/pfps/${detail.owner_profile_pic_url}`
    : undefined;

  const senderAvatarUrl = detail?.original_sender_profile_pic_url
    ? `${IMAGES_URL}/pfps/${detail.original_sender_profile_pic_url}`
    : undefined;

  const giftDescription = detail?.description?.trim();

  const attributes = [
    {
      key: t("giftDetail.owner"),
      value: (
        <Flex
          align="center"
          gap={8}
          className="cursor-pointer hover:opacity-75 transition-opacity"
          onClick={handleOwnerClick}
        >
          <Avatar size={24} src={ownerAvatarUrl} icon={!ownerAvatarUrl ? <UserOutlined /> : undefined} />
          <UserNameWithBadge
            username={detail?.owner_username}
            fallback={t("common.unknown")}
            badgeId={detail?.owner_profile_badge_achievement_id}
            badgeImageUrl={detail?.owner_profile_badge_image_url}
            badgeTitle={detail?.owner_profile_badge_title}
            textColorClassName="!text-[var(--accent-150)]"
          />
        </Flex>
      ),
    },
    ...(detail?.original_sender_username ? [{
      key: t("giftDetail.from"),
      value: (
        <Flex
          align="center"
          gap={8}
          className="cursor-pointer hover:opacity-75 transition-opacity"
          onClick={handleSenderClick}
        >
          <Avatar size={24} src={senderAvatarUrl} icon={!senderAvatarUrl ? <UserOutlined /> : undefined} />
          <UserNameWithBadge
            username={detail.original_sender_username}
            badgeId={detail.original_sender_profile_badge_achievement_id}
            badgeImageUrl={detail.original_sender_profile_badge_image_url}
            badgeTitle={detail.original_sender_profile_badge_title}
            textColorClassName="!text-[var(--accent-150)]"
          />
        </Flex>
      ),
    }] : []),
    {
      key: t("giftDetail.collection"),
      value: detail?.collection_name || "-",
    },
    {
      key: t("giftDetail.totalSupply"),
      value: detail?.total_supply || 0,
    },
    {
      key: t("giftDetail.basePrice"),
      value: `${parseFloat(detail?.base_price || "0").toFixed(2)} TON`,
    },
    ...(activeListingPrice !== null && Number.isFinite(activeListingPrice) ? [{
      key: t("giftDetail.salePrice"),
      value: `${activeListingPriceLabel} TON`,
    }] : []),
    ...(giftDescription ? [{
      key: t("giftDetail.message"),
      value: (
        <Text className="max-w-[220px] whitespace-pre-wrap break-words text-right">
          {giftDescription}
        </Text>
      ),
    }] : []),
  ];

  if (detail?.is_upgraded) {
    if (detail.model_name) {
      attributes.push({ key: t("giftDetail.model"), value: detail.model_name });
    }

    if (detail.background_name) {
      attributes.push({ key: t("giftDetail.background"), value: detail.background_name });
    }

    if (detail.symbol_name) {
      attributes.push({ key: t("giftDetail.symbol"), value: detail.symbol_name });
    }
  }

  const imageUrl = getPresentDisplayImageUrl(
    detail?.image_url || detail?.collection_image_url,
    !!detail?.is_upgraded,
  );

  const rouletteFinalImageUrl = rouletteFinalDetail
    ? getPresentDisplayImageUrl(
        rouletteFinalDetail.image_url || rouletteFinalDetail.collection_image_url,
        true,
      )
    : null;

  const rouletteBackgroundImageUrl = getAssetUrl("bgs", rouletteBackground?.image_url);
  const rouletteModelImageUrl = getAssetUrl("models", rouletteModel?.image_url);

  const hasModels = detail?.has_models;
  const canListForSale = canManage && !currentUserBlocked && !!detail?.is_upgraded && !detail?.is_on_sale;
  const canRemoveFromSale = canManage && !currentUserBlocked && !!detail?.is_on_sale;
  const canBuyListedGift = !canManage && !currentUserBlocked && !!detail?.active_listing_id;
  const rouletteRunning = rouletteOpen && !rouletteFinished;

  return (
    <>
      {contextHolder}

      <Modal
        open={open}
        onCancel={handleClose}
        footer={null}
        width="min(400px, calc(100vw - 24px))"
        title={null}
        maskClosable={!rouletteRunning}
        closable={!rouletteRunning}
      >
        <Flex vertical align="center" gap={16} className="pt-4">
          {rouletteOpen ? (
            <div className="relative w-[180px] h-[180px] sm:w-[210px] sm:h-[210px] rounded-[var(--size-smm)] overflow-hidden border border-[var(--black-transparent)] bg-[var(--liquid-glass-bg)]">
              {rouletteFinished && rouletteFinalImageUrl ? (
                <img
                  src={rouletteFinalImageUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain"
                />
              ) : (
                <>
                  {rouletteBackgroundImageUrl ? (
                    <img
                      src={rouletteBackgroundImageUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[var(--liquid-glass-bg)]" />
                  )}

                  {rouletteModelImageUrl ? (
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                      <img
                        src={rouletteModelImageUrl}
                        alt=""
                        className="block max-h-full max-w-full object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.45)]"
                        style={{
                          transform: "scale(1.15)",
                          transformOrigin: "center",
                        }}
                      />
                    </div>
                  ) : (
                    <Flex align="center" justify="center" className="absolute inset-0">
                      <Text type="secondary">...</Text>
                    </Flex>
                  )}

                  <div className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1.5 text-center">
                    <Text className="!text-white text-xs">
                      {rouletteModel?.name || "..."}
                    </Text>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Image
              src={imageUrl}
              alt={detail?.collection_name}
              width="min(180px, 58vw)"
              preview={false}
              className="rounded-[var(--size-smm)]"
            />
          )}

          <Flex vertical align="center" gap={4}>
            <Title level={4} className="!mb-0 !text-center break-words">
              {rouletteRunning
                ? t("giftDetail.upgrading")
                : rouletteFinished
                  ? t("giftDetail.upgraded")
                  : `${detail?.collection_name} #${detail?.present_num}`}
            </Title>

            <Flex gap={4} wrap="wrap" justify="center">
              {detail?.is_upgraded ? (
                <Tag color="purple">{t("giftDetail.upgraded")}</Tag>
              ) : (
                <Tag>{t("giftDetail.basic")}</Tag>
              )}

              {detail?.is_on_sale && (
                <Tag color="blue">{t("giftDetail.onSale")}</Tag>
              )}
            </Flex>
          </Flex>

          <div className="w-full rounded-[var(--size-smm)] border-solid border border-[var(--black-60)] overflow-hidden">
            {attributes.map((attr, i) => (
              <Flex
                key={attr.key}
                justify="space-between"
                align="center"
                gap={12}
                wrap="wrap"
                className={`px-4 py-3 ${i % 2 === 0 ? "bg-[var(--liquid-glass-bg)]" : ""} ${
                  i !== attributes.length - 1 ? "border-b border-[var(--black-transparent)]" : ""
                }`}
              >
                <Text type="secondary" className="shrink-0 mr-4">
                  {attr.key}
                </Text>

                <Flex align="center" gap={8} className="min-w-0">
                  {typeof attr.value === "string" || typeof attr.value === "number" ? (
                    <Text className="break-words text-right">{attr.value}</Text>
                  ) : (
                    attr.value
                  )}
                </Flex>
              </Flex>
            ))}
          </div>

          <Flex vertical gap={8} className="w-full">
            {rouletteRunning && (
              <Button
                block
                disabled={!rouletteCanSkip}
                onClick={finishRoulette}
              >
                {t("giftDetail.skip")}
              </Button>
            )}

            {rouletteFinished && rouletteOpen && (
              <Button
                type="primary"
                block
                onClick={() => {
                  setRouletteOpen(false);
                  setRouletteFinished(false);
                }}
              >
                {t("common.ok")}
              </Button>
            )}

            {!rouletteOpen && canManage && !currentUserBlocked && (
              <Flex
                align="center"
                justify="space-between"
                className="cursor-pointer px-2 py-1 rounded hover:bg-[var(--black-transparent-05)] transition-colors"
                onClick={handleToggleVisibility}
              >
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {detail?.is_visible === 1
                    ? t("giftDetail.visible")
                    : t("giftDetail.hidden")}
                </Text>

                <Text
                  className="!text-[var(--accent-150)]"
                  style={{ fontSize: 13 }}
                >
                  {detail?.is_visible === 1 ? t("giftDetail.hideFromProfile") : t("giftDetail.show")}{" "}
                  <RightOutlined style={{ fontSize: 10 }} />
                </Text>
              </Flex>
            )}

            {!rouletteOpen && canManage && !currentUserBlocked && !detail?.is_on_sale && !detail?.is_upgraded && (
              <Popconfirm
                title={t("giftDetail.burnToRedeem")}
                description={
                  <Flex vertical gap={4}>
                    <Text>
                      <Text strong style={{ color: "var(--color-primary)" }}>
                        {t("giftDetail.burnRefundDescription", { amount: burnRefundAmount })}
                      </Text>
                    </Text>

                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t("giftDetail.burnRefundPercent", { percent: burnRefundPercent })}
                    </Text>
                  </Flex>
                }
                onConfirm={handleBurn}
                okText={t("giftDetail.burn")}
                cancelText={t("common.cancel")}
                okButtonProps={{ danger: true, loading: submitting }}
              >
                <Button
                  danger
                  size="large"
                  block
                  icon={<FireOutlined />}
                  loading={submitting}
                >
                  {t("giftDetail.burnButton", { amount: burnRefundAmount })}
                </Button>
              </Popconfirm>
            )}

            {!rouletteOpen && canManage && !currentUserBlocked && hasModels && !detail?.is_upgraded && (
              <Button
                type="primary"
                size="large"
                block
                icon={<FireOutlined />}
                loading={submitting}
                onClick={handleUpgrade}
              >
                {t("giftDetail.upgrade", { amount: upgradePriceAmount })}
              </Button>
            )}

            {!rouletteOpen && canListForSale && !isListingFormOpen && (
              <Button
                type="primary"
                size="large"
                block
                icon={<TagOutlined />}
                onClick={handleOpenListingForm}
              >
                {t("giftDetail.listForSale")}
              </Button>
            )}

            {!rouletteOpen && canListForSale && isListingFormOpen && (
              <Flex vertical gap={8}>
                <InputNumber
                  min={0.01}
                  max={MAX_LISTING_PRICE}
                  step={0.01}
                  precision={2}
                  value={listingPrice}
                  onChange={(value) => setListingPrice(typeof value === "number" ? value : null)}
                  placeholder={t("giftDetail.price")}
                  addonAfter="TON"
                  size="large"
                  className="w-full"
                />

                {priceEstimateLoading ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t("giftDetail.loadingRecommended")}
                  </Text>
                ) : recommendedPrice !== null ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t("giftDetail.recommendedPrice", { price: recommendedPrice.toFixed(2) })}
                  </Text>
                ) : (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t("giftDetail.noRecommendation")}
                  </Text>
                )}

                <Flex gap={8}>
                  <Button
                    type="primary"
                    size="large"
                    block
                    icon={<TagOutlined />}
                    loading={submitting}
                    onClick={handleCreateListing}
                  >
                    {t("common.confirm")}
                  </Button>

                  <Button
                    size="large"
                    block
                    onClick={() => {
                      setIsListingFormOpen(false);
                      setListingPrice(null);
                      setRecommendedPrice(null);
                    }}
                  >
                    {t("common.cancel")}
                  </Button>
                </Flex>
              </Flex>
            )}

            {!rouletteOpen && canRemoveFromSale && (
              <Button
                danger
                size="large"
                block
                icon={<StopOutlined />}
                loading={submitting}
                onClick={handleCancelListing}
              >
                {t("giftDetail.removeFromSale")}
              </Button>
            )}

            {!rouletteOpen && canBuyListedGift && (
              <Button
                type="primary"
                size="large"
                block
                icon={<TagOutlined />}
                loading={submitting}
                onClick={handleBuyListing}
              >
                {t("giftDetail.buyFor", { price: activeListingPriceLabel })}
              </Button>
            )}

            {!rouletteOpen && (!canManage || !hasModels) && !canBuyListedGift && (
              <Button
                type="default"
                size="large"
                block
                icon={<CheckOutlined />}
                onClick={onClose}
              >
                {t("common.ok")}
              </Button>
            )}
          </Flex>
        </Flex>
      </Modal>
    </>
  );
};

export default GiftDetailModal;
