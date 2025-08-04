import type { MetaRecord } from 'nextra';

export default {
  index: {
    type: 'page',
    display: 'hidden',
    theme: {
      typesetting: 'article',
      toc: false,
    },
  },
  'getting-started': {
    type: 'page',
    title: 'Начало работы',
  },
  methodology: {
    type: 'page',
    title: 'Методология',
  },
  reference: {
    type: 'page',
    title: 'Справочник',
  },

  nextra_link: {
    type: 'page',
    title: 'API Документация',
    href: 'https://docs.kvant.app/documentation/openapi',
  },
} satisfies MetaRecord;
