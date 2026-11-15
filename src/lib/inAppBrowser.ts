/** @file Detects iPhones and in-app browsers (Telegram, Instagram, ...), which often cannot share location and need the page opened in Safari or Chrome. */

const UA = typeof navigator === "undefined" ? "" : navigator.userAgent;

/** True on iPhone, iPad and iPod. */
export const IOS = /iPhone|iPad|iPod/.test(UA);

/** True inside another app's built-in browser, where location is usually unavailable. */
export const IN_APP_BROWSER = /FBAN|FBAV|Instagram|Snapchat|TikTok|MicroMessenger|Line\/|Twitter|; wv\)/.test(UA) || (IOS && !/Safari/.test(UA));
