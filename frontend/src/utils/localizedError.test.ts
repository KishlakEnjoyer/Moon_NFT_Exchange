import i18n from "../i18n";
import { getLocalizedErrorMessage } from "./localizedError";

describe("getLocalizedErrorMessage", () => {
  it("translates known backend errors to Russian", async () => {
    await i18n.changeLanguage("ru");

    expect(
      getLocalizedErrorMessage(
        new Error("Cannot access another user's cart"),
        i18n.t.bind(i18n),
        "cart.failedBuyCart",
      ),
    ).toBe("Нельзя открыть чужую корзину");
  });

  it("translates known backend errors to English", async () => {
    await i18n.changeLanguage("en");

    expect(
      getLocalizedErrorMessage(
        new Error("Cannot access another user's cart"),
        i18n.t.bind(i18n),
        "cart.failedBuyCart",
      ),
    ).toBe("Cannot access another user's cart");
  });

  it("falls back to the current UI language for unknown raw errors", async () => {
    await i18n.changeLanguage("ru");

    expect(
      getLocalizedErrorMessage(
        new Error("Internal upstream failure"),
        i18n.t.bind(i18n),
        "cart.failedBuyCart",
      ),
    ).toBe("Не удалось купить корзину");
  });
});
