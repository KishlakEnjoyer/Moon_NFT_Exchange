import type { TFunction } from "i18next";

const API_ERROR_KEYS_BY_MESSAGE: Record<string, string> = {
  "User is inactive": "errors.api.userInactive",
  "Not found": "errors.api.notFound",
  "User not found": "errors.api.userNotFound",
  "Present not found": "errors.api.presentNotFound",
  "Collection not found": "errors.api.collectionNotFound",
  "Listing not found": "errors.api.listingNotFound",
  "Active listing not found": "errors.api.activeListingNotFound",
  "Album not found": "errors.api.albumNotFound",
  "Notification not found": "errors.api.notificationNotFound",
  "Cart item not found": "errors.api.cartItemNotFound",
  "Cart is empty": "errors.api.cartEmpty",
  "Cannot access another user's cart": "errors.api.cannotAccessAnotherUsersCart",
  "Cannot modify another user's cart": "errors.api.cannotModifyAnotherUsersCart",
  "Cannot clear another user's cart": "errors.api.cannotClearAnotherUsersCart",
  "Cannot buy another user's cart": "errors.api.cannotBuyAnotherUsersCart",
  "Cannot access another user's notifications": "errors.api.cannotAccessAnotherUsersNotifications",
  "Cannot modify another user's notifications": "errors.api.cannotModifyAnotherUsersNotifications",
  "Cannot create albums for another user": "errors.api.cannotCreateAlbumsForAnotherUser",
  "Cannot access another user's albums": "errors.api.cannotAccessAnotherUsersAlbums",
  "You do not own this album": "errors.api.youDoNotOwnAlbum",
  "You do not own this present": "errors.api.youDoNotOwnPresent",
  "Cannot act as another user": "errors.api.cannotActAsAnotherUser",
  "Cannot add your own listing to cart": "errors.api.cannotAddOwnListingToCart",
  "Item already in cart": "errors.api.itemAlreadyInCart",
  "Only upgraded presents can be listed for sale": "errors.api.onlyUpgradedPresentsCanBeListed",
  "Burned presents cannot be listed": "errors.api.burnedPresentsCannotBeListed",
  "Present is already listed for sale": "errors.api.presentAlreadyListedForSale",
  "Invalid listing price": "errors.api.invalidListingPrice",
  "Price must be greater than 0": "errors.api.priceMustBeGreaterThanZero",
  "Price must be less than or equal to 100000": "errors.api.priceMax",
  "price_min cannot be greater than price_max": "errors.api.priceRangeInvalid",
  "Cannot pin burned present": "errors.api.cannotPinBurnedPresent",
  "You can pin up to 7 gifts": "errors.api.pinLimit",
  "Cannot follow yourself": "errors.api.cannotFollowYourself",
  "Achievement is not awarded to this user": "errors.api.achievementNotAwarded",
  "Only visible achievements can be used as a profile badge": "errors.api.visibleAchievementsOnly",
  "Cannot report yourself": "errors.api.cannotReportYourself",
  "You have already submitted this report": "errors.api.reportAlreadySubmitted",
  "Cannot submit reports as another user": "errors.api.cannotSubmitReportsAsAnotherUser",
  "Receiver not found": "errors.api.receiverNotFound",
  "Receiver account is blocked": "errors.api.receiverBlocked",
  "Report not found": "errors.api.reportNotFound",
  "Report is already closed": "errors.api.reportAlreadyClosed",
  "Report target not found": "errors.api.reportTargetNotFound",
  "Report target account is blocked": "errors.api.reportTargetBlocked",
  "State expired or not found": "errors.api.stateExpired",
  "This auth request is no longer active": "errors.api.authNoLongerActive",
  "This auth request is already confirmed": "errors.api.authAlreadyConfirmed",
  "This Telegram account is already linked to another user": "errors.api.telegramAlreadyLinked",
  "This VK account is already linked to another user": "errors.api.vkAlreadyLinked",
  "Username cannot be empty": "errors.api.usernameEmpty",
  "Username must be 3-32 characters long and use only Russian/English letters, numbers, and underscores": "errors.api.usernameInvalid",
  "Username is already taken": "errors.api.usernameTaken",
  "Nickname and about me cannot contain links": "errors.api.profileTextLinks",
  "Nickname or about me contains forbidden words": "errors.api.profileTextForbidden",
  "Nickname or about me did not pass moderation": "errors.api.profileTextRejected",
  "Profile text moderation is unavailable": "errors.api.profileTextUnavailable",
  "Image is required": "errors.api.imageRequired",
  "Image upload is required": "errors.api.imageUploadRequired",
  "Image must be PNG, JPG, or WEBP": "errors.api.imageInvalidType",
  "Image must be a PNG, JPG, or WEBP file": "errors.api.imageInvalidType",
  "Image is not valid base64 data": "errors.api.imageInvalidBase64",
  "Image cannot be empty": "errors.api.imageEmpty",
  "Image must be 5 MB or smaller": "errors.api.imageTooLarge",
  "Image file is invalid": "errors.api.imageInvalidFile",
  "Profile image must be a PNG, JPG, or WEBP file": "errors.api.profileImageInvalidType",
  "Profile image is not valid base64 data": "errors.api.profileImageInvalidBase64",
  "Profile image cannot be empty": "errors.api.profileImageEmpty",
  "Profile image must be 5 MB or smaller": "errors.api.profileImageTooLarge",
  "User wallet not found": "errors.api.walletNotFound",
  "Wallet private key not found": "errors.api.walletPrivateKeyNotFound",
  "Platform key not configured": "errors.api.platformKeyMissing",
  "Refund transaction failed": "errors.api.refundFailed",
  "Upgrade payment transaction failed": "errors.api.upgradePaymentFailed",
  "Present already burned": "errors.api.burnAlreadyDone",
  "Cannot burn a present that is on sale": "errors.api.cannotBurnOnSale",
  "Present is already upgraded": "errors.api.alreadyUpgraded",
  "Cannot upgrade a present that is on sale": "errors.api.cannotUpgradeOnSale",
  "Unknown achievement rule": "errors.api.unknownAchievementRule",
  "Achievement image is required": "errors.api.achievementImageRequired",
  "Achievement not found": "errors.api.achievementNotFound",
  "Dictionary not found": "errors.api.dictionaryNotFound",
  "Dictionary item not found": "errors.api.dictionaryItemNotFound",
  "Moderation payload is missing a name": "errors.api.moderationPayloadMissingName",
  "Moderation item is missing an image": "errors.api.moderationMissingImage",
  "Moderation item not found": "errors.api.moderationItemNotFound",
  "Moderation item is already closed": "errors.api.moderationAlreadyClosed",
  "Unsupported moderation item": "errors.api.unsupportedModerationItem",
  "Cannot review your own moderation request": "errors.api.cannotReviewOwnModeration",
  "You have already voted on this moderation request": "errors.api.alreadyVotedModeration",
  "Manager role is required": "errors.api.managerRequired",
  "Admin role is required": "errors.api.adminRequired",
  "Permission required: roles.manage": "errors.api.rolesManageRequired",
  "Only a master admin can create master admin roles": "errors.api.masterAdminCreateRequired",
  "Role already exists": "errors.api.roleAlreadyExists",
  "Role not found": "errors.api.roleNotFound",
  "Cannot edit master admin role": "errors.api.cannotEditMasterAdmin",
  "Cannot delete master admin role": "errors.api.cannotDeleteMasterAdmin",
  "Role is used by users": "errors.api.roleUsedByUsers",
  "Cannot change your own role": "errors.api.cannotChangeOwnRole",
  "Cannot change a master admin role": "errors.api.cannotChangeMasterAdminRole",
  "Cannot deactivate yourself": "errors.api.cannotDeactivateSelf",
  "TOPUP_INTERNAL_SECRET is not set": "errors.api.topupSecretMissing",
  "Invalid topup secret": "errors.api.topupSecretInvalid",
  "Topup not found": "errors.api.topupNotFound",
  "Topup source mismatch": "errors.api.topupSourceMismatch",
  "Topup is not pending": "errors.api.topupNotPending",
  "Topup already failed": "errors.api.topupAlreadyFailed",
  "Payment amount mismatch": "errors.api.paymentAmountMismatch",
  "Payment currency mismatch": "errors.api.paymentCurrencyMismatch",
  "Payment metadata mismatch": "errors.api.paymentMetadataMismatch",
};

const CYRILLIC_RE = /[А-Яа-яЁё]/;
const LATIN_RE = /[A-Za-z]/;

const getErrorDetail = (error: unknown): string => {
  if (error instanceof Error) return error.message.trim();
  if (typeof error === "string") return error.trim();

  if (error && typeof error === "object" && "detail" in error) {
    const detail = (error as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail.trim();
  }

  return "";
};

const isRussianLocale = (t: TFunction) => CYRILLIC_RE.test(String(t("common.russian")));

const shouldUseFallback = (message: string, isRu: boolean) => {
  if (!message) return true;
  if (/^HTTP\s+\d+/i.test(message)) return true;
  if (/<\/?[a-z][\s\S]*>/i.test(message)) return true;

  const hasCyrillic = CYRILLIC_RE.test(message);
  const hasLatin = LATIN_RE.test(message);
  return isRu ? hasLatin && !hasCyrillic : hasCyrillic;
};

export const getLocalizedErrorMessage = (
  error: unknown,
  t: TFunction,
  fallbackKey = "errors.requestFailed",
): string => {
  const message = getErrorDetail(error);
  const exactKey = API_ERROR_KEYS_BY_MESSAGE[message];

  if (exactKey) {
    return String(t(exactKey));
  }

  const insufficientBalance = message.match(/^Insufficient balance\. Need (.*), have (.*)$/i);
  if (insufficientBalance) {
    return String(t("errors.insufficientBalance", {
      need: insufficientBalance[1],
      have: insufficientBalance[2],
    }));
  }

  const permissionRequired = message.match(/^Permission required:\s*(.+)$/i);
  if (permissionRequired) {
    return String(t("errors.permissionRequired", { permission: permissionRequired[1] }));
  }

  const blockchainError = message.match(/^Blockchain error:\s*(.+)$/i);
  if (blockchainError) {
    return String(t("errors.blockchainError", { message: blockchainError[1] }));
  }

  if (/^Smart search unavailable:/i.test(message)) {
    return String(t("errors.smartSearchUnavailable"));
  }

  const invalidField = message.match(/^Invalid\s+(.+)$/i);
  if (invalidField) {
    return String(t("errors.invalidField", { field: invalidField[1] }));
  }

  const isRu = isRussianLocale(t);
  if (shouldUseFallback(message, isRu)) {
    return String(t(fallbackKey));
  }

  return message || String(t(fallbackKey));
};
