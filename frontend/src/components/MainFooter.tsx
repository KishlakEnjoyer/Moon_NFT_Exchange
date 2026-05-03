import { Footer } from "antd/es/layout/layout"
import Text from "antd/es/typography/Text";
import { useTranslation } from "react-i18next";


const MainFooter = () => {
  const { t } = useTranslation();

  return (
    <Footer className="flex min-h-[var(--size-3xl)] h-auto w-full justify-center items-center text-center z-3 !bg-[var(--black-70)] z-10 px-3 py-3">
        <Text className="text-[var(--white-50)] opacity-50 text-[var(--size-sm)]">
            {t("footer.thesis")}
            <br />
            TG: @jdm_enjoyerr | Git: KishlakEnjoyer
        </Text>
    </Footer>
);
}

export default MainFooter;
