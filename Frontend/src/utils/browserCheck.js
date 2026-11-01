/**
 * Utility to verify if the candidate's browser is genuine Google Chrome.
 * Restricts access for other browsers like Edge, Firefox, Safari, Brave, Opera, etc.
 */
export const checkIsGoogleChrome = () => {
  if (typeof navigator === 'undefined') {
    return { isChrome: true, currentBrowser: 'Unknown (SSR)' };
  }

  const ua = navigator.userAgent || '';
  const vendor = navigator.vendor || '';

  const isEdge = /Edg\//i.test(ua);
  const isOpera = /OPR\/|Opera/i.test(ua);
  const isBrave = Boolean(
    typeof window !== 'undefined' &&
    window.navigator?.brave &&
    typeof window.navigator.brave.isBrave === 'function'
  );
  const isFirefox = /Firefox|FxiOS/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua);
  const isVivaldi = /Vivaldi/i.test(ua);
  const isYandex = /YaBrowser/i.test(ua);

  // Chromium check (Chrome on Desktop / Android / CriOS on iOS, or vendor Google Inc.)
  const isChromium =
    /Chrome|CriOS/i.test(ua) ||
    (typeof window !== 'undefined' && window.chrome !== undefined && vendor === 'Google Inc.');

  const isChrome =
    isChromium &&
    !isEdge &&
    !isOpera &&
    !isBrave &&
    !isFirefox &&
    !isSafari &&
    !isVivaldi &&
    !isYandex;

  let currentBrowser = 'Unknown Browser';
  if (isEdge) currentBrowser = 'Microsoft Edge';
  else if (isFirefox) currentBrowser = 'Mozilla Firefox';
  else if (isSafari) currentBrowser = 'Apple Safari';
  else if (isOpera) currentBrowser = 'Opera';
  else if (isBrave) currentBrowser = 'Brave Browser';
  else if (isVivaldi) currentBrowser = 'Vivaldi';
  else if (isYandex) currentBrowser = 'Yandex Browser';
  else if (isChrome) currentBrowser = 'Google Chrome';

  return {
    isChrome,
    currentBrowser,
    userAgent: ua,
  };
};
