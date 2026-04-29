import { Alert, Button, Flex, Modal, Spin, Typography } from "antd";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

type AuthProvider = "tg" | "vk";

interface QrModalProps {
  open: boolean;
  onClose: () => void;
  provider: AuthProvider;
  stateValue: string;
  authLink: string;
  instruction?: string;
  isLoading?: boolean;
  onTimeout?: () => void;
  onSelectProvider: (provider: AuthProvider) => void;
}

const AUTH_TIMEOUT_MS = 5 * 60 * 1000;

const { Paragraph, Text, Title } = Typography;

export const QrModal: React.FC<QrModalProps> = ({
  open,
  onClose,
  provider,
  stateValue,
  authLink,
  instruction = "",
  isLoading = false,
  onTimeout,
  onSelectProvider,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(AUTH_TIMEOUT_MS);

  useEffect(() => {
    if (!open || !stateValue) return;

    setTimeLeft(AUTH_TIMEOUT_MS);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1000) {
          clearInterval(timer);
          onTimeout?.();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, stateValue, provider, onTimeout]);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSec / 60).toString().padStart(2, "0");
    const seconds = (totalSec % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const handleOpenLink = () => {
    if (authLink) {
      window.open(authLink, "_blank", "noopener,noreferrer");
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <Flex vertical align="center" gap={12} className="py-8">
          <Spin size="large" />
          <Text type="secondary">Preparing authorization...</Text>
        </Flex>
      );
    }

    if (!authLink && provider === "tg") {
      return (
        <Alert
          message="Authorization error"
          description="Unable to generate Telegram login link."
          type="error"
          showIcon
        />
      );
    }

    if (!stateValue) {
      return (
        <Alert
          message="Authorization error"
          description="Unable to generate login state."
          type="error"
          showIcon
        />
      );
    }

    if (provider === "tg") {
      return (
        <Flex vertical align="center" gap={16}>
          <QRCodeSVG
            value={authLink}
            size={200}
            level="H"
            includeMargin
            className="rounded-lg border border-gray-200"
          />

          <Text className="text-center text-gray-500">
            Scan the QR code in Telegram or open the bot directly.
          </Text>

          <Button
            type="primary"
            icon={<img src="/icons/tg-icon-png.png" alt="TG" width={16} />}
            onClick={handleOpenLink}
            size="large"
          >
            Open Telegram
          </Button>
        </Flex>
      );
    }

    return (
      <Flex vertical align="center" gap={16} className="w-full">
        <Title level={5} className="!mb-0">
          VK login
        </Title>

        <Text className="text-center text-gray-500">
          Open the VK bot and send the state below.
        </Text>

        <div className="w-full rounded-xl border border-[var(--black-transparent)] bg-[var(--liquid-glass-bg)] px-4 py-4 text-center">
          <Text type="secondary" className="block mb-2">
            State
          </Text>
          <Paragraph copyable={{ text: stateValue }} className="!mb-0 !font-mono !text-base break-all">
            {stateValue}
          </Paragraph>
        </div>

        {instruction ? (
          <Text type="secondary" className="text-center whitespace-pre-line">
            {instruction}
          </Text>
        ) : null}

        <Button
          type="primary"
          onClick={handleOpenLink}
          size="large"
        >
          Open VK Bot
        </Button>
      </Flex>
    );
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      closable
      width="min(480px, calc(100vw - 24px))"
      title="Authorization"
      destroyOnClose
    >
      <Flex vertical gap={16} className="py-2">
        <Flex gap={8}>
          <Button
            type={provider === "tg" ? "primary" : "default"}
            onClick={() => onSelectProvider("tg")}
            className="flex-1"
          >
            Connect TG
          </Button>
          <Button
            type={provider === "vk" ? "primary" : "default"}
            onClick={() => onSelectProvider("vk")}
            className="flex-1"
          >
            Connect VK
          </Button>
        </Flex>

        <div className="flex flex-col items-center gap-4 py-2">
          {renderContent()}

          {stateValue ? (
            <div className="w-full max-w-[240px]">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <Text>Time left</Text>
                <Text>{formatTime(timeLeft)}</Text>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${(timeLeft / AUTH_TIMEOUT_MS) * 100}%` }}
                />
              </div>
            </div>
          ) : null}

          {timeLeft <= 0 ? (
            <Alert
              message="Code expired"
              description="Switch provider or reopen authorization to get a new state."
              type="warning"
              showIcon
              className="w-full"
            />
          ) : null}
        </div>
      </Flex>
    </Modal>
  );
};

export default QrModal;
