import en from "./locales/en.json";
import ru from "./locales/ru.json";

const flattenKeys = (value: unknown, prefix = ""): string[] => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value).flatMap(([key, child]) => (
    flattenKeys(child, prefix ? `${prefix}.${key}` : key)
  ));
};

describe("i18n dictionaries", () => {
  it("keep English and Russian keys in sync", () => {
    const enKeys = flattenKeys(en);
    const ruKeys = flattenKeys(ru);

    expect(enKeys.filter((key) => !ruKeys.includes(key))).toEqual([]);
    expect(ruKeys.filter((key) => !enKeys.includes(key))).toEqual([]);
  });
});
