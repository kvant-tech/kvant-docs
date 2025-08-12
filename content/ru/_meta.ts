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
  'api-documentation': {
    type: 'page',
    title: 'API Документация',
    href: 'https://docs.kvant.app/documentation/openapi',
  },
  'for-shareholders': {
    type: 'page',
    title: 'Акционерам',
    display: 'hidden',
    theme: {
      typesetting: 'article',
      timestamp: false,
    },
  },
} satisfies MetaRecord;
