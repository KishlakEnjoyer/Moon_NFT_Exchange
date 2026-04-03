import { CameraOutlined, EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";
import { Avatar, Button, Flex, Input, Modal, Switch, Typography, message } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";

import { updateProfile, UpdateProfileResponse } from "../services/profileService";

const { Text, Title } = Typography;
const { TextArea } = Input;

const MAX_USERNAME_LENGTH = 32;
const MAX_ABOUT_ME_LENGTH = 150;
const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

interface EditableProfileData {
  about_me: string | null;
  profile_pic_url: string | null;
  tg_username: string | null;
  tg_visibility: number;
  user_id: number;
  username: string;
}

interface EditProfileModalProps {
  open: boolean;
  profile: EditableProfileData | null;
  onClose: () => void;
  onSaved: (profile: UpdateProfileResponse) => void;
}

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to read image"));
    };

    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });

const EditProfileModal = ({ open, profile, onClose, onSaved }: EditProfileModalProps) => {
  const [messageApi, contextHolder] = message.useMessage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [username, setUsername] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [tgVisible, setTgVisible] = useState(true);
  const [profilePicDataUrl, setProfilePicDataUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !profile) {
      return;
    }

    setUsername(profile.username ?? "");
    setAboutMe(profile.about_me ?? "");
    setTgVisible(Number(profile.tg_visibility) === 1);
    setProfilePicDataUrl(null);
  }, [open, profile]);

  const previewSrc = useMemo(() => {
    if (profilePicDataUrl) {
      return profilePicDataUrl;
    }

    if (profile?.profile_pic_url) {
      return `${process.env.REACT_APP_IMAGES_URL}/pfps/${profile.profile_pic_url}`;
    }

    return `${process.env.REACT_APP_IMAGES_URL}/pfps/example_user.png`;
  }, [profile, profilePicDataUrl]);

  const handlePickImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      messageApi.error("Use PNG, JPG, or WEBP for the profile photo");
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      messageApi.error("Profile photo must be 5 MB or smaller");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setProfilePicDataUrl(dataUrl);
    } catch (error) {
      console.error("Failed to read profile photo:", error);
      messageApi.error("Failed to read profile photo");
    }
  };

  const handleSave = async () => {
    if (!profile) {
      return;
    }

    const trimmedUsername = username.trim();
    const trimmedAboutMe = aboutMe.trim();

    if (!trimmedUsername) {
      messageApi.error("Username cannot be empty");
      return;
    }

    setIsSaving(true);

    try {
      const updatedProfile = await updateProfile(profile.user_id, {
        username: trimmedUsername,
        about_me: trimmedAboutMe || null,
        tg_visibility: tgVisible ? 1 : 0,
        profile_pic_data_url: profilePicDataUrl,
      });

      messageApi.success("Profile updated");
      onSaved(updatedProfile);
      onClose();
    } catch (error) {
      console.error("Failed to update profile:", error);
      messageApi.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        open={open}
        onCancel={onClose}
        onOk={handleSave}
        okText="Save"
        cancelText="Cancel"
        confirmLoading={isSaving}
        width={560}
        title={<Title level={4} className="!mb-0">Edit Profile</Title>}
      >
        <Flex vertical gap={16} className="mt-4">
          <Flex
            align="center"
            justify="space-between"
            className="rounded-[var(--size-smm)] border border-[var(--black-transparent)] bg-[var(--liquid-glass-bg)] px-4 py-4"
          >
            <Flex align="center" gap={16}>
              <Avatar size={72} src={previewSrc} className="border border-gray-500" />
              <Flex vertical gap={4}>
                <Text strong>Profile Photo</Text>
                <Text type="secondary">PNG, JPG, or WEBP up to 5 MB</Text>
              </Flex>
            </Flex>

            <Button icon={<CameraOutlined />} onClick={handlePickImage} className="!bg-[var(--liquid-glass-bg)]">
              Change
            </Button>
          </Flex>

          <div className="rounded-[var(--size-smm)] border border-[var(--black-transparent)] bg-[var(--liquid-glass-bg)] p-4">
            <Text strong className="block mb-2">Nickname</Text>
            <Input
              value={username}
              maxLength={MAX_USERNAME_LENGTH}
              showCount
              placeholder="Enter your nickname"
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>

          <div className="rounded-[var(--size-smm)] border border-[var(--black-transparent)] bg-[var(--liquid-glass-bg)] p-4">
            <Text strong className="block mb-2">About Me</Text>
            <TextArea
              value={aboutMe}
              maxLength={MAX_ABOUT_ME_LENGTH}
              showCount
              rows={4}
              placeholder="Tell something about yourself"
              onChange={(event) => setAboutMe(event.target.value)}
            />
          </div>

          <Flex
            align="center"
            justify="space-between"
            className="rounded-[var(--size-smm)] border border-[var(--black-transparent)] bg-[var(--liquid-glass-bg)] px-4 py-4"
          >
            <Flex vertical gap={4}>
              <Text strong>Telegram Visibility</Text>
              <Text type="secondary">
                {profile?.tg_username ? `@${profile.tg_username}` : "Telegram account"}
              </Text>
            </Flex>

            <Flex align="center" gap={10}>
              {tgVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              <Switch checked={tgVisible} onChange={setTgVisible} />
            </Flex>
          </Flex>

          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            hidden
            onChange={handleFileChange}
          />
        </Flex>
      </Modal>
    </>
  );
};

export default EditProfileModal;
