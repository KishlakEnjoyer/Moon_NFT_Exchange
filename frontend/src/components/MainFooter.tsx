import { Footer } from "antd/es/layout/layout"
import Text from "antd/es/typography/Text";
import "../styles/FooterStyle.css";


const MainFooter = () => {
  return (
    <Footer className="footer-container">
        <Text style={{color: 'var(--white-100)'}}>
            The project was developed as part of a thesis.
            <br />
            TG: @jdm_enjoyerr | Git: KishlakEnjoyer
        </Text>
    </Footer>
);
}

export default MainFooter;