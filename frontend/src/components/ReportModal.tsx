import { Button, Flex, Modal, Radio, message, Typography } from "antd";
import { useEffect, useState } from "react";
import { FlagOutlined } from "@ant-design/icons";
import { authFetch } from "../services/auth";
import { useTranslation } from "react-i18next";
import { getLocalizedErrorMessage } from "../utils/localizedError";

const { Text, Title } = Typography;

interface ReportTypeOption {
  report_type_id: number;
  report_type_title: string;
}

interface ReportModalProps {
  open: boolean;
  senderId: number;
  receiverId: number;
  onClose: () => void;
}

const ReportModal = ({ open, senderId, receiverId, onClose }: ReportModalProps) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [reportTypes, setReportTypes] = useState<ReportTypeOption[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    fetch(`${process.env.REACT_APP_API_URL}/reports/types`)
      .then((res) => res.json())
      .then((data) => setReportTypes(data))
      .catch(() => messageApi.error(t("report.failedLoadTypes")));

    setSelectedTypeId(null);
  }, [open, messageApi, t]);

  const handleSubmit = async () => {
    if (!selectedTypeId) {
      messageApi.warning(t("report.selectReason"));
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await authFetch(`${process.env.REACT_APP_API_URL}/reports/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_id: senderId,
          receiver_id: receiverId,
          report_type_id: selectedTypeId,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || t("report.failedSubmit"));
      }

      messageApi.success(t("report.submitted"));
      onClose();
    } catch (error) {
      console.error("Failed to submit report:", error);
      messageApi.error(getLocalizedErrorMessage(error, t, "report.failedSubmit"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        open={open}
        onCancel={onClose}
        footer={
          <Flex justify="flex-end" gap={8} wrap="wrap">
            <Button onClick={onClose} className="!bg-[var(--liquid-glass-bg)]">
              {t("common.cancel")}
            </Button>
            <Button
              type="primary"
              danger
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={!selectedTypeId}
            >
              {t("report.submit")}
            </Button>
          </Flex>
        }
        width="min(480px, calc(100vw - 24px))"
        title={
          <Flex align="center" gap={8}>
            <FlagOutlined />
            <Title level={4} className="!mb-0">{t("report.title")}</Title>
          </Flex>
        }
      >
        <Flex vertical gap={16} className="mt-4">
          <div className="rounded-[var(--size-smm)] border border-[var(--black-transparent)] bg-[var(--liquid-glass-bg)] p-4">
            <Text strong className="block mb-3">{t("report.reason")}</Text>
            <Radio.Group
              value={selectedTypeId}
              onChange={(e) => setSelectedTypeId(e.target.value)}
              className="w-full"
            >
              <Flex vertical gap={12}>
                {reportTypes.map((type) => (
                  <Radio
                    key={type.report_type_id}
                    value={type.report_type_id}
                    className="text-[var(--liquid-glass-fg)]"
                  >
                    {type.report_type_title}
                  </Radio>
                ))}
              </Flex>
            </Radio.Group>
          </div>
        </Flex>
      </Modal>
    </>
  );
};

export default ReportModal;
