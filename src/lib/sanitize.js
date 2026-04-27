/**
 * sanitize.js — DOMPurify-based XSS sanitizer for Electron renderer
 *
 * Because Electron renders pages in Chromium, we use the real DOM-backed
 * DOMPurify (not the isomorphic version) for maximum compatibility.
 *
 * Usage:
 *   import { sanitizeMessage, sanitizeHtml, stripHtml } from '@/lib/sanitize';
 *
 *   // Safe: renders plain text only (recommended for chat bubbles)
 *   const safeText = sanitizeMessage(untrustedMessage);
 *
 *   // Safe: allows a restricted whitelist of HTML tags (for rich messages)
 *   const safeHtml = sanitizeHtml(untrustedHtml);
 *
 *   // Strips ALL HTML — returns plain text
 *   const plainText = stripHtml(untrustedHtml);
 */

import DOMPurify from 'dompurify';

// ── Strict config: PLAIN TEXT ONLY (default for chat messages) ───
const PLAIN_TEXT_CONFIG = {
  ALLOWED_TAGS: [],       // No HTML tags at all
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,     // Keep the text nodes inside stripped tags
};

// ── Rich text config: limited safe tags only (for announcements etc.) ──
const RICH_TEXT_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'span', 'a'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  FORBID_SCRIPTS: true,
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
  FORCE_BODY: true,
  // Force all links to open externally (safe for Electron)
  ADD_ATTR: ['target'],
};

// Hook: force all <a> to open in external browser, not inside Electron
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

/**
 * sanitizeMessage — strips ALL HTML from a chat message.
 * This is the safest option and should be used for all inbound messages.
 *
 * @param {string} dirty - raw untrusted string from Facebook/Zalo/TikTok
 * @returns {string} clean plain text
 */
export function sanitizeMessage(dirty) {
  if (!dirty || typeof dirty !== 'string') return '';
  return DOMPurify.sanitize(dirty, PLAIN_TEXT_CONFIG);
}

/**
 * sanitizeHtml — allows a limited whitelist of safe HTML.
 * Use for system notifications or admin-authored content only.
 *
 * @param {string} dirty - raw HTML string
 * @returns {string} safe HTML string
 */
export function sanitizeHtml(dirty) {
  if (!dirty || typeof dirty !== 'string') return '';
  return DOMPurify.sanitize(dirty, RICH_TEXT_CONFIG);
}

/**
 * stripHtml — removes all HTML, returns plain text.
 * Alias of sanitizeMessage for clarity at call sites.
 *
 * @param {string} dirty
 * @returns {string}
 */
export function stripHtml(dirty) {
  return sanitizeMessage(dirty);
}
