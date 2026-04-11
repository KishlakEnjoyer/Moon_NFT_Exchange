import { Modal, Button, Spin, Alert, Typography } from "antd";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

interface QrModalProps {
  open: boolean;
  onClose: () => void;
  deepLink: string;
  isLoading?: boolean;
  onTimeout?: () => void;
}

const QR_TIMEOUT_MS = 5 * 60 * 1000; // 5 минут

const { Text } = Typography;


export const QrModal: React.FC<QrModalProps> = ({
  open,
  onClose,
  deepLink,
  isLoading = false,
  onTimeout,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(QR_TIMEOUT_MS);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Определяем мобильный экран
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Авто-открытие deep link на мобильных
  useEffect(() => {
    if (open && deepLink && isMobile) {
      window.open(deepLink, "_blank", "noopener,noreferrer");
      // На мобильных можно сразу закрыть модалку, но оставим на усмотрение
      // onClose(); 
    }
  }, [open, deepLink, isMobile]);

  // Таймер обратного отсчёта
  useEffect(() => {
    if (!open || !deepLink) return;

    setTimeLeft(QR_TIMEOUT_MS);
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
  }, [open, deepLink, onTimeout]);

  // Форматируем время мм:сс
  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleOpenTelegram = () => {
    if (deepLink) {
      window.open(deepLink, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      closable
      title="Авторизация через Telegram"
      destroyOnClose
    >
      <div className="flex flex-col items-center gap-4 py-4">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Spin size="large" />
            <Text className="text-gray-500">Генерация кода...</Text>
          </div>
        ) : deepLink ? (
          <>
            <QRCodeSVG
              value={deepLink}
              size={200}
              level="H"
              includeMargin
              className="rounded-lg border border-gray-200 dark:border-gray-700"
            />

            <Text className="text-center text-gray-500">
              Отсканируйте код в Telegram,<br />или нажмите кнопку ниже
            </Text>

            <Button
              type="primary"
              icon={
                <img
                  src="/icons/tg-icon-png.png"
                  alt="TG"
                  width={16}
                  style={{ filter: "brightness(0) invert(1)" }}
                />
              }
              onClick={handleOpenTelegram}
              size="large"
            >
              Открыть Telegram
            </Button>

            {/* Таймер и прогресс */}
            <div className="w-full max-w-[200px]">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <Text>Время на сканирование</Text>
                <Text>{formatTime(timeLeft)}</Text>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
                  style={{
                    width: `${(timeLeft / QR_TIMEOUT_MS) * 100}%`,
                  }}
                />
              </div>
            </div>

            {timeLeft <= 0 && (
              <Alert
                message="Время вышло"
                description="Нажмите «Попробовать снова», чтобы получить новый код"
                type="warning"
                showIcon
                className="w-full"
              />
            )}
          </>
        ) : (
          <Alert
            message="Ошибка"
            description="Не удалось получить ссылку для авторизации"
            type="error"
            showIcon
          />
        )}
      </div>
    </Modal>
  );
};

export default QrModal;