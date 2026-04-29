import {
  CameraOutlined,
  CheckCircleOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Flex, Input, Modal, Switch, Typography, message } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";

import QrModal from "./QrModal";
import { authFetch, setAuthSession } from "../services/auth";
import { detectNsfwImage } from "../services/nsfwDetectorService";
import { updateProfile, UpdateProfileResponse } from "../services/profileService";

const { Text, Title } = Typography;
const { TextArea } = Input;

const MAX_USERNAME_LENGTH = 32;
const MAX_ABOUT_ME_LENGTH = 150;
const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

type AuthProvider = "tg" | "vk";

interface EditableProfileData {
  about_me: string | null;
  profile_pic_url: string | null;
  tg_username: string | null;
  vk_username: string | null;
  tg_visibility: number;
  vk_visibility: number;
  user_id: number;
  user_tg_id: number | null;
  user_vk_id: number | null;
  username: string;
}

interface EditProfileModalProps {
  open: boolean;
  profile: EditableProfileData | null;
  onClose: () => void;
  onSaved: (profile: UpdateProfileResponse) => void;
  onLinked: () => void;
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

const EditProfileModal = ({ open, profile, onClose, onSaved, onLinked }: EditProfileModalProps) => {
  const [messageApi, contextHolder] = message.useMessage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pollingRef = useRef<number | null>(null);
  const authAbortRef = useRef<AbortController | null>(null);
  const profilePhotoCheckAbortRef = useRef<AbortController | null>(null);
  const profilePhotoCheckIdRef = useRef(0);

  const [username, setUsername] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [tgVisible, setTgVisible] = useState(true);
  const [vkVisible, setVkVisible] = useState(true);
  const [profilePicDataUrl, setProfilePicDataUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingProfilePhoto, setIsCheckingProfilePhoto] = useState(false);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authProvider, setAuthProvider] = useState<AuthProvider>("tg");
  const [authStateValue, setAuthStateValue] = useState("");
  const [authLink, setAuthLink] = useState("");
  const [authInstruction, setAuthInstruction] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  useEffect(() => {
    if (!open || !profile) {
      if (profilePhotoCheckAbortRef.current) {
        profilePhotoCheckIdRef.current += 1;
        profilePhotoCheckAbortRef.current.abort();
        profilePhotoCheckAbortRef.current = null;
      }
      setIsCheckingProfilePhoto(false);
      return;
    }

    setUsername(profile.username ?? "");
    setAboutMe(profile.about_me ?? "");
    setTgVisible(Number(profile.tg_visibility) === 1);
    setVkVisible(Number(profile.vk_visibility) === 1);
    setProfilePicDataUrl(null);
  }, [open, profile]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }

      if (authAbortRef.current) {
        authAbortRef.current.abort();
        authAbortRef.current = null;
      }

      if (profilePhotoCheckAbortRef.current) {
        profilePhotoCheckIdRef.current += 1;
        profilePhotoCheckAbortRef.current.abort();
        profilePhotoCheckAbortRef.current = null;
      }
    };
  }, []);

  const previewSrc = useMemo(() => {
    if (profilePicDataUrl) {
      return profilePicDataUrl;
    }

    if (profile?.profile_pic_url) {
      return `${process.env.REACT_APP_IMAGES_URL}/pfps/${profile.profile_pic_url}`;
    }

    return `${process.env.REACT_APP_IMAGES_URL}/pfps/example_user.png`;
  }, [profile, profilePicDataUrl]);

  const clearAuthPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const closeAuthModal = () => {
    clearAuthPolling();
    if (authAbortRef.current) {
      authAbortRef.current.abort();
      authAbortRef.current = null;
    }
    setAuthModalOpen(false);
    setIsAuthLoading(false);
    setAuthStateValue("");
    setAuthLink("");
    setAuthInstruction("");
  };

  const startAuthPolling = (state: string, provider: AuthProvider) => {
    clearAuthPolling();

    pollingRef.current = window.setInterval(async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/auth/status/${state}`);
        if (!res.ok) {
          return;
        }

        const data = await res.json();

        if (data.status === "confirmed") {
          if (!data.access_token) {
            throw new Error("Missing access token");
          }

          clearAuthPolling();
          setAuthSession(data.access_token, data.user, data.token_type || "Bearer");
          window.dispatchEvent(new Event("storage"));
          setAuthModalOpen(false);
          setIsAuthLoading(false);
          messageApi.success(provider === "tg" ? "Telegram connected" : "VK connected");
          onLinked();
          return;
        }

        if (data.status === "expired" || data.status === "failed" || data.status === "declined") {
          clearAuthPolling();
          setIsAuthLoading(false);
          messageApi.error("Connection request expired");
        }
      } catch (error) {
        clearAuthPolling();
        setIsAuthLoading(false);
        console.error("Auth polling failed:", error);
      }
    }, 2000);
  };

  const startLinkAuth = async (provider: AuthProvider) => {
    if (!profile) {
      return;
    }

    const alreadyConnected =
      provider === "tg" ? Boolean(profile.user_tg_id) : Boolean(profile.user_vk_id);

    if (alreadyConnected) {
      return;
    }

    try {
      setAuthProvider(provider);
      setAuthModalOpen(true);
      setIsAuthLoading(true);
      setAuthStateValue("");
      setAuthLink("");
      setAuthInstruction("");

      clearAuthPolling();
      if (authAbortRef.current) {
        authAbortRef.current.abort();
      }

      const controller = new AbortController();
      authAbortRef.current = controller;

      const endpoint = provider === "tg" ? "tg" : "vk";
      const response = await authFetch(`${process.env.REACT_APP_API_URL}/auth/link/${endpoint}/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to start linking");
      }

      const data = await response.json();
      const state = data.state;
      const link = provider === "tg" ? data.deep_link : data.bot_link;
      const instruction = provider === "vk" ? data.instruction || "" : "";

      setAuthProvider(provider);
      setAuthStateValue(state);
      setAuthLink(link);
      setAuthInstruction(instruction);
      setIsAuthLoading(false);

      startAuthPolling(state, provider);
    } catch (error) {
      setIsAuthLoading(false);
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      console.error("Failed to start linking:", error);
      messageApi.error(error instanceof Error ? error.message : "Failed to start linking");
    }
  };

  const handlePickImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    profilePhotoCheckIdRef.current += 1;
    const checkId = profilePhotoCheckIdRef.current;

    if (profilePhotoCheckAbortRef.current) {
      profilePhotoCheckAbortRef.current.abort();
      profilePhotoCheckAbortRef.current = null;
    }

    setIsCheckingProfilePhoto(false);

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      messageApi.error("Use PNG, JPG, or WEBP for the profile photo");
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      messageApi.error("Profile photo must be 5 MB or smaller");
      return;
    }

    try {
      const controller = new AbortController();
      profilePhotoCheckAbortRef.current = controller;
      setIsCheckingProfilePhoto(true);

      const dataUrl = await readFileAsDataUrl(file);
      const isSafe = await detectNsfwImage({ image_data_url: dataUrl }, controller.signal);

      if (checkId !== profilePhotoCheckIdRef.current) {
        return;
      }

      if (!isSafe) {
        setProfilePicDataUrl(null);
        messageApi.error("Profile photo did not pass moderation");
        return;
      }

      setProfilePicDataUrl(dataUrl);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      console.error("Failed to check profile photo:", error);
      messageApi.error(error instanceof Error ? error.message : "Failed to check profile photo");
    } finally {
      if (checkId === profilePhotoCheckIdRef.current) {
        profilePhotoCheckAbortRef.current = null;
        setIsCheckingProfilePhoto(false);
      }
    }
  };

  const handleSave = async () => {
    if (!profile) {
      return;
    }

    if (isCheckingProfilePhoto) {
      messageApi.warning("Wait until the profile photo check finishes");
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
        vk_visibility: vkVisible ? 1 : 0,
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

  const renderPlatformCard = (
    provider: AuthProvider,
    connected: boolean,
    usernameValue: string | null,
    switchValue: boolean,
    onSwitchChange: (checked: boolean) => void,
  ) => {
    const title = provider === "tg" ? "Telegram" : "VK";
    const statusText = connected
      ? provider === "tg"
        ? "TG connected"
        : "VK connected"
      : provider === "tg"
        ? "Telegram is not connected"
        : "VK is not connected";

    return (
      <Flex
        align="center"
        justify="space-between"
        gap={12}
        wrap="wrap"
        className="rounded-[var(--size-smm)] border border-[var(--black-transparent)] bg-[var(--liquid-glass-bg)] px-4 py-4"
      >
        <Flex vertical gap={4} className="min-w-0 flex-1">
          <Text strong>{title}</Text>
          <Text type="secondary" ellipsis={{ tooltip: usernameValue || statusText }}>
            {usernameValue || statusText}
          </Text>
        </Flex>

        <Flex align="center" gap={12} wrap="wrap">
          {connected ? (
            <Flex align="center" gap={6}>
              <CheckCircleOutlined style={{ color: "#52c41a" }} />
              <Text style={{ color: "#52c41a" }}>{provider === "tg" ? "TG connected" : "VK connected"}</Text>
            </Flex>
          ) : (
            <Button onClick={() => void startLinkAuth(provider)} className="!bg-[var(--liquid-glass-bg)]">
              {provider === "tg" ? "Connect TG" : "Connect VK"}
            </Button>
          )}

          <Flex align="center" gap={10}>
            {switchValue ? <EyeOutlined /> : <EyeInvisibleOutlined />}
            <Switch checked={switchValue} onChange={onSwitchChange} disabled={!connected} />
          </Flex>
        </Flex>
      </Flex>
    );
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
        confirmLoading={isSaving || isCheckingProfilePhoto}
        okButtonProps={{ disabled: isCheckingProfilePhoto }}
        width="min(560px, calc(100vw - 24px))"
        title={<Title level={4} className="!mb-0">Edit Profile</Title>}
      >
        <Flex vertical gap={16} className="mt-4">
          <Flex
            align="center"
            justify="space-between"
            gap={12}
            wrap="wrap"
            className="rounded-[var(--size-smm)] border border-[var(--black-transparent)] bg-[var(--liquid-glass-bg)] px-4 py-4"
          >
            <Flex align="center" gap={16} className="min-w-0 flex-1">
              <Avatar size={{ xs: 56, sm: 72 }} src={previewSrc} className="border border-gray-500 shrink-0" />
              <Flex vertical gap={4} className="min-w-0">
                <Text strong>Profile Photo</Text>
                <Text type="secondary" className="break-words">PNG, JPG, or WEBP up to 5 MB</Text>
              </Flex>
            </Flex>

            <Button
              icon={<CameraOutlined />}
              onClick={handlePickImage}
              loading={isCheckingProfilePhoto}
              className="!bg-[var(--liquid-glass-bg)]"
            >
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

          {renderPlatformCard("tg", Boolean(profile?.user_tg_id), profile?.tg_username ?? null, tgVisible, setTgVisible)}
          {renderPlatformCard("vk", Boolean(profile?.user_vk_id), profile?.vk_username ?? null, vkVisible, setVkVisible)}

          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            hidden
            onChange={handleFileChange}
          />
        </Flex>
      </Modal>

      <QrModal
        open={authModalOpen}
        onClose={closeAuthModal}
        provider={authProvider}
        stateValue={authStateValue}
        authLink={authLink}
        instruction={authInstruction}
        isLoading={isAuthLoading}
        onSelectProvider={(provider) => {
          if (provider === "tg" && profile?.user_tg_id) {
            return;
          }

          if (provider === "vk" && profile?.user_vk_id) {
            return;
          }

          void startLinkAuth(provider);
        }}
      />
    </>
  );
};

export default EditProfileModal;
