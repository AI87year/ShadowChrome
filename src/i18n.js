export const LANGS = {
  en: {
    name: 'English',
    flag: '🇺🇸',
    strings: {
      languageLabel: 'Language',
      accessUrlLabel: 'Access URL',
      accessUrlPlaceholder: 'ss:// or ssconf://',
      locationLabel: 'Location',
      connectBtn: 'Connect',
      disconnectBtn: 'Disconnect',
      statusStarting: 'Starting proxy...',
      statusRunning: 'Proxy running on 127.0.0.1:1080',
      statusError: 'Error:',
      statusSelectLocation: 'Select location and press Connect',
      statusFailed: 'Failed to start proxy',
      statusStopping: 'Stopping...',
      statusStopped: 'Proxy stopped',
      proxyDomainsHeading: 'Proxy Domains',
      domainPlaceholder: 'example.com',
      addDomainBtn: 'Add Domain'
    }
  },
  lv: {
    name: 'Latviešu',
    flag: '🇱🇻',
    strings: {
      languageLabel: 'Valoda',
      accessUrlLabel: 'Piekļuves URL',
      accessUrlPlaceholder: 'ss:// vai ssconf://',
      locationLabel: 'Atrašanās vieta',
      connectBtn: 'Savienot',
      disconnectBtn: 'Atvienot',
      statusStarting: 'Startē proxy...',
      statusRunning: 'Proxy darbojas 127.0.0.1:1080',
      statusError: 'Kļūda:',
      statusSelectLocation: 'Izvēlies atrašanās vietu un spied Savienot',
      statusFailed: 'Neizdevās palaist proxy',
      statusStopping: 'Apstādināšana...',
      statusStopped: 'Proxy apstādināts',
      proxyDomainsHeading: 'Proxy domēni',
      domainPlaceholder: 'example.com',
      addDomainBtn: 'Pievienot domēnu'
    }
  },
  be: {
    name: 'Беларуская',
    flag: '🇧🇾',
    strings: {
      languageLabel: 'Мова',
      accessUrlLabel: 'URL доступу',
      accessUrlPlaceholder: 'ss:// або ssconf://',
      locationLabel: 'Лакацыя',
      connectBtn: 'Падключыць',
      disconnectBtn: 'Адключыць',
      statusStarting: 'Запуск проксі...',
      statusRunning: 'Проксі працуе на 127.0.0.1:1080',
      statusError: 'Памылка:',
      statusSelectLocation: 'Абярыце лакацыю і націсніце Падключыць',
      statusFailed: 'Не ўдалося запусціць проксі',
      statusStopping: 'Спыненне...',
      statusStopped: 'Проксі спынены',
      proxyDomainsHeading: 'Проксі дамены',
      domainPlaceholder: 'example.com',
      addDomainBtn: 'Дадаць дамен'
    }
  },
  de: {
    name: 'Deutsch',
    flag: '🇩🇪',
    strings: {
      languageLabel: 'Sprache',
      accessUrlLabel: 'Zugangs-URL',
      accessUrlPlaceholder: 'ss:// oder ssconf://',
      locationLabel: 'Standort',
      connectBtn: 'Verbinden',
      disconnectBtn: 'Trennen',
      statusStarting: 'Proxy wird gestartet...',
      statusRunning: 'Proxy läuft auf 127.0.0.1:1080',
      statusError: 'Fehler:',
      statusSelectLocation: 'Standort wählen und Verbinden drücken',
      statusFailed: 'Proxy konnte nicht gestartet werden',
      statusStopping: 'Beenden...',
      statusStopped: 'Proxy gestoppt',
      proxyDomainsHeading: 'Proxy-Domains',
      domainPlaceholder: 'example.com',
      addDomainBtn: 'Domain hinzufügen'
    }
  }
};

export function getMessage(lang, key) {
  return (LANGS[lang] && LANGS[lang].strings[key]) || LANGS.en.strings[key] || key;
}
