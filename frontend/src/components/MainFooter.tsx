import { Footer } from "antd/es/layout/layout"
import Text from "antd/es/typography/Text";


const MainFooter = () => {
  return (
    <Footer className="flex h-[var(--size-3xl)] w-full justify-center items-center text-center z-3 !bg-[var(--black-70)] z-10">
        <Text className="text-[var(--white-50)] opacity-50 text-[var(--size-sm)]">
            The project was developed as part of a thesis.
            <br />
            TG: @jdm_enjoyerr | Git: KishlakEnjoyer
        </Text>
    </Footer>
);
}

export default MainFooter;