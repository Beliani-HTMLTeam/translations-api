const settings = {
  issue_regex: /issue_logs\/(\d+)\/?/i,

  // time to live in seconds, after that entry is considered expired and will be renewed on next request or by worker
  ttl: 30 * 60, // 30 minutes

  // how often worker should check for expired entries in seconds
  workerInterval: 600, // 10 minutes

  headers: {
    // allowed headers, skip stuff like " ", weird spreadsheet artifacts etc
    allowed: [
      'UK',
      'PL',
      'DE',
      'AT',
      'CH',
      'NL',
      'FR',
      'CHFR',
      'ES',
      'PT',
      'IT',
      'DK',
      'NO',
      'FI',
      'SE',
      'CZ',
      'SK',
      'HU',
      'BEFR',
      'BENL',
      'RO',
      'CHIT',
      // ! < ---- add more allowed headers here if needed in the future (eg. SI HR)
    ],

    // on some olds spreadsheets i noticed there was "CH" header instead of "CHDE",
    // so this allows to transform it on the fly without need to change spreadsheet (if overlooked by someone)
    transformations: {
      CH: 'CHDE',
      // ! < ---- add more transformations here if needed in the future
      // ! 'OLD_NAME': 'NEW_NAME',
    },
  },

  endpoints: {
    static: {
      messages: {
        success_refresh: 'Cache refreshed!',
        not_found: 'No translations found!',
        error: 'Error 500! Unexpected error occurred.',
        available_languages: 'Available language slugs fetched successfully',
      },
      routes: {
        category_links: {
          tags: ['Category Links'],
          endpoint: '/category_links',
          sheetName: 'CATEGORY_LINKS',
          messages: { success_fetch: 'Category links fetched successfully' },
        },
        category_titles: {
          tags: ['Category Titles'],
          endpoint: '/category_titles',
          sheetName: 'CATEGORY_TITLES',
          messages: { success_fetch: 'Category titles fetched successfully' },
        },
        footer: {
          tags: ['Footer'],
          endpoint: '/footer',
          sheetName: 'FOOTER',
          messages: { success_fetch: 'Footer fetched successfully' },
        },
        header: {
          tags: ['Header'],
          endpoint: '/header',
          sheetName: 'HEADER',
          messages: { success_fetch: 'Header fetched successfully' },
        },
        templates: {
          tags: ['Templates'],
          endpoint: '/templates',
          sheetName: 'TEMPLATES',
          messages: { success_fetch: 'Templates fetched successfully' },
        },
      },
    },
    dynamic: {
      tags: ['Dynamic'],
      messages: {
        success_fetch: 'Dynamic sheet fetched successfully',
        success_refresh: 'Cache refreshed!',
        not_found: 'No translations found!',
        error: 'Error 500! Unexpected error occurred.',
      },
    },
  },
}

export default settings
