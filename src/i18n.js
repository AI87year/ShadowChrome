import { getFromStorage, setInStorage } from './browser-api.js';

export const LANGUAGES = {
  en: {
    label: 'English \uD83C\uDDFA\uD83C\uDDF8',
    strings: {
      language: 'Language',
      accessUrl: 'Access URL',
      location: 'Location',
      connect: 'Connect',
      disconnect: 'Disconnect',
      proxyDomains: 'Proxy Domains',
      addDomain: 'Add Domain',
      starting: 'Starting proxy...',
      running: 'Proxy running on 127.0.0.1:1080',
      error: 'Error: ',
      selectLocation: 'Select location and press Connect',
      failed: 'Failed to start proxy',
      stopping: 'Stopping...',
      stopped: 'Proxy stopped'
    }
  },
  lv: {
    label: 'Latviešu \uD83C\uDDF1\uD83C\uDDFB',
    strings: {
      language: 'Valoda',
      accessUrl: 'Piek\u013Cuves URL',
      location: 'Atra\u0161an\u0101s vieta',
      connect: 'Piesl\u0113gties',
      disconnect: 'Atvienot',
      proxyDomains: 'Proxy dom\u0113ni',
      addDomain: 'Pievienot dom\u0113nu',
      starting: 'Start\u0113 proksi...',
      running: 'Proksi darbojas uz 127.0.0.1:1080',
      error: 'K\u013C\u016Bda: ',
      selectLocation: 'Izv\u0113lieties atra\u0161an\u0101s vietu un spiediet Piesl\u0113gties',
      failed: 'Neizdev\u0101s start\u0113t proksi',
      stopping: 'Aptur proksi...',
      stopped: 'Proksi aptur\u0113ts'
    }
  },
  be: {
    label: '\u0411\u0435\u043B\u0430\u0440\u0443\u0441\u043A\u0430\u044F \uD83C\uDDE7\uD83C\uDDFE',
    strings: {
      language: '\u041C\u043E\u0432\u0430',
      accessUrl: 'URL \u0434\u043E\u0441\u0442\u0443\u043F\u0443',
      location: '\u0420\u0430\u0437\u043C\u044F\u0448\u0447\u044D\u043D\u043D\u0435',
      connect: '\u041F\u0430\u0434\u043A\u043B\u044E\u0447\u044B\u0446\u0446\u0430',
      disconnect: '\u0410\u0434\u043A\u043B\u044E\u0447\u044B\u0446\u0446\u0430',
      proxyDomains: '\u041F\u0440\u043E\u043A\u0441\u0456 \u0434\u0430\u043C\u0435\u043D\u044B',
      addDomain: '\u0414\u0430\u0434\u0430\u0446\u044C \u0434\u0430\u043C\u0435\u043D',
      starting: '\u0417\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0446\u0446\u0430 \u043F\u0440\u043E\u043A\u0441\u0456...',
      running: '\u041F\u0440\u043E\u043A\u0441\u0456 \u043F\u0440\u0430\u0446\u0443\u0435 \u043D\u0430 127.0.0.1:1080',
      error: '\u041F\u0430\u043C\u044B\u043B\u043A\u0430: ',
      selectLocation: '\u0412\u044B\u0431\u0435\u0440\u0446\u0435 \u0440\u0430\u0437\u043C\u044F\u0448\u0447\u044D\u043D\u043D\u0435 \u0456 \u043D\u0430\u0446\u0456\u0441\u043D\u0456\u0446\u0435 \u041F\u0430\u0434\u043A\u043B\u044E\u0447\u044B\u0446\u0446\u0430',
      failed: '\u041D\u0435 \u045E\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u043F\u0443\u0441\u0446\u0456 \u043F\u0440\u043E\u043A\u0441\u0456',
      stopping: '\u0421\u043F\u044B\u043D\u044F\u0435\u043C...',
      stopped: '\u041F\u0440\u043E\u043A\u0441\u0456 \u0441\u043F\u044B\u043D\u0435\u043D\u044B'
    }
  },
  de: {
    label: 'Deutsch \uD83C\uDDE9\uD83C\uDDEA',
    strings: {
      language: 'Sprache',
      accessUrl: 'Zugangs-URL',
      location: 'Standort',
      connect: 'Verbinden',
      disconnect: 'Trennen',
      proxyDomains: 'Proxy-Domains',
      addDomain: 'Domain hinzuf\u00FCgen',
      starting: 'Proxy wird gestartet...',
      running: 'Proxy l\u00E4uft auf 127.0.0.1:1080',
      error: 'Fehler: ',
      selectLocation: 'Standort ausw\u00E4hlen und Verbinden dr\u00FCcken',
      failed: 'Proxy konnte nicht gestartet werden',
      stopping: 'Beenden...',
      stopped: 'Proxy gestoppt'
    }
  }
};

const DEFAULT_LANG = 'en';

export async function loadLanguage() {
  const { lang } = await getFromStorage(['lang']);
  return lang && LANGUAGES[lang] ? lang : DEFAULT_LANG;
}

export function setLanguage(lang) {
  return setInStorage({ lang });
}

