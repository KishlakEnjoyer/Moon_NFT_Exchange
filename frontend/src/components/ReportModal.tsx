import { Button, Flex, Modal, Radio, message, Typography } from "antd";
import { useEffect, useState } from "react";
import { FlagOutlined } from "@ant-design/icons";

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
  const [messageApi, contextHolder] = message.useMessage();
  const [reportTypes, setReportTypes] = useState<ReportTypeOption[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    fetch(`${process.env.REACT_APP_API_URL}/reports/types`)
      .then((res) => res.json())
      .then((data) => setReportTypes(data))
      .catch(() => messageApi.error("Failed to load report types"));

    setSelectedTypeId(null);
  }, [open, messageApi]);

  const handleSubmit = async () => {
    if (!selectedTypeId) {
      messageApi.warning("Please select a report reason");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/reports/submit`, {
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
        throw new Error(error.detail || "Failed to submit report");
      }

      messageApi.success("Report submitted");
      onClose();
    } catch (error) {
      console.error("Failed to submit report:", error);
      messageApi.error(error instanceof Error ? error.message : "Failed to submit report");
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
          <Flex justify="flex-end" gap={8}>
            <Button onClick={onClose} className="!bg-[var(--liquid-glass-bg)]">
              Cancel
            </Button>
            <Button
              type="primary"
              danger
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={!selectedTypeId}
            >
              Submit Report
            </Button>
          </Flex>
        }
        width={480}
        title={
          <Flex align="center" gap={8}>
            <FlagOutlined />
            <Title level={4} className="!mb-0">Report User</Title>
          </Flex>
        }
      >
        <Flex vertical gap={16} className="mt-4">
          <div className="rounded-[var(--size-smm)] border border-[var(--black-transparent)] bg-[var(--liquid-glass-bg)] p-4">
            <Text strong className="block mb-3">Reason for report</Text>
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
