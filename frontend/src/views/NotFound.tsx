import { useTranslation } from "react-i18next";

const NotFound = () => {
  const { t } = useTranslation();

  return (
    <div className="text-white flex justify-center min-h-screen w-full items-center text-2xl">
      {t("notFound.message")}
    </div>
  );
};

export default NotFound;
