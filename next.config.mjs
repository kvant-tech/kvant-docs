import nextra from 'nextra';

const withNextra = nextra({
  defaultShowCopyCode: true,
  latex: true,
});

export default withNextra({
  reactStrictMode: true,
  i18n: {
    locales: ['en', 'ru'],
    defaultLocale: 'en',
  },
  allowedDevOrigins: ['100.77.91.185'],
});
