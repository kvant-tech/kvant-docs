import { Footer, LastUpdated, Layout, Navbar } from 'nextra-theme-docs';

import { getPageMap } from 'nextra/page-map';
import { getDictionary, getDirection } from '../_dictionaries/get-dictionary';
import { i18n } from '../_dictionaries/i18n-config';
import { KvantLogo } from 'components/kvant-logo';

import type { Metadata } from 'next';

import '../globals.css';

import { Banner, Head, Search } from 'nextra/components';

export const metadata: Metadata = {
  description: 'Kvant Docs is a documentation for Kvant App',
  title: {
    absolute: '',
    template: '%s | Kvant Docs',
  },
  appleWebApp: {
    title: 'Kvant Docs',
  },
  other: {
    'msapplication-TileColor': '#fff',
  },
};

export default async function RootLayout({ children, params }) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);
  const pageMap = await getPageMap(lang);

  return (
    <html lang={lang} dir={getDirection(lang)} suppressHydrationWarning>
      <Head
        backgroundColor={{
          dark: 'rgb(22,22,22)',
          light: 'rgb(251,251,253)',
        }}
        color={{
          hue: { dark: 240, light: 240 },
          saturation: { dark: 20, light: 20 },
          lightness: { dark: 90, light: 43 },
        }}
      />
      <body>
        <Layout
          navbar={
            <Navbar logo={<KvantLogo variant={dictionary.logo.variant} />} />
          }
          banner={
            <Banner storageKey="developing">
              ☝️ Документация находится в разработке
            </Banner>
          }
          docsRepositoryBase="https://github.com/kvant-tech/kvant-docs/blob/main"
          i18n={i18n.languages}
          sidebar={{
            defaultMenuCollapseLevel: 1,
            autoCollapse: true,
          }}
          editLink={dictionary.editPage}
          pageMap={pageMap}
          search={
            <Search
              emptyResult={dictionary.searchEmptyResult}
              errorText={dictionary.searchError}
              loading={dictionary.searchLoading}
              placeholder={dictionary.searchPlaceholder}
            />
          }
          lastUpdated={<LastUpdated>{dictionary.lastUpdated}</LastUpdated>}
          themeSwitch={{
            dark: dictionary.dark,
            light: dictionary.light,
            system: dictionary.system,
          }}
          toc={{
            backToTop: dictionary.backToTop,
            title: dictionary.tocTitle,
          }}
          feedback={{ content: null }}
          footer={<Footer />}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
