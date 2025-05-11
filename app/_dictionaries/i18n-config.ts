import type EnglishLocale from "./en";

export type LogoVariant = "latin" | "cyrillic";

export type Dictionary = typeof EnglishLocale & {
  logo: {
    title: string;
    variant: LogoVariant;
  };
};

export type Language = {
  locale: string;
  name: string;
  logoVariant: LogoVariant;
};

// Nextra's i18n configuration (without custom properties)
export const i18n = {
  defaultLocale: "en" as const,
  locales: ["en", "ru"] as const,
  languages: [
    { locale: "en", name: "English" },
    { locale: "ru", name: "Русский" },
  ] as { locale: string; name: string }[],
};

export type Locale = (typeof i18n)["locales"][number];
export type Dictionaries = Record<Locale, Dictionary>;
