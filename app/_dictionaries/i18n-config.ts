export type LogoVariant = 'latin' | 'cyrillic';

export type Dictionary = {
  dark: string;
  light: string;
  system: string;
  backToTop: string;
  lastUpdated: string;
  logo: {
    title: string;
    variant: LogoVariant;
  };
  notFound: string;
  lightweight: string;
  realtime: string;
  suspense: string;
  pagination: string;
  backendAgnostic: string;
  renderingStrategies: string;
  typescript: string;
  remoteLocal: string;
  editPage: string;
  by: string;
  searchEmptyResult: string;
  searchError: string;
  searchLoading: string;
  searchPlaceholder: string;
  tocTitle: string;
};

export type Language = {
  locale: string;
  name: string;
  logoVariant: LogoVariant;
};

// Nextra's i18n configuration (without custom properties)
export const i18n = {
  defaultLocale: 'en' as const,
  locales: ['en', 'ru'] as const,
  languages: [
    { locale: 'en', name: 'English' },
    { locale: 'ru', name: 'Русский' },
  ] as { locale: string; name: string }[],
};

export type Locale = (typeof i18n)['locales'][number];
export type Dictionaries = Record<
  Locale,
  () => Promise<{ default: Dictionary }>
>;
