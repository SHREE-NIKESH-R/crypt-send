/**
 * CryptSend Crypto Engine
 * RSA-OAEP-2048 + AES-256-GCM via Web Crypto API
 * Private key bundled with upload so receiver only needs the code
 */
const Crypto = (() => {

  /* ── RSA ── */
  async function genRSA() {
    return crypto.subtle.generateKey(
      { name:'RSA-OAEP', modulusLength:2048, publicExponent:new Uint8Array([1,0,1]), hash:'SHA-256' },
      true, ['encrypt','decrypt']
    );
  }

  async function exportPub(key) {
    return b64(await crypto.subtle.exportKey('spki', key));
  }
  async function exportPriv(key) {
    return b64(await crypto.subtle.exportKey('pkcs8', key));
  }
  async function importPub(b64str) {
    return crypto.subtle.importKey('spki', unb64(b64str),
      { name:'RSA-OAEP', hash:'SHA-256' }, false, ['encrypt']);
  }
  async function importPriv(b64str) {
    return crypto.subtle.importKey('pkcs8', unb64(b64str),
      { name:'RSA-OAEP', hash:'SHA-256' }, false, ['decrypt']);
  }

  /* ── AES ── */
  async function genAES() {
    return crypto.subtle.generateKey({ name:'AES-GCM', length:256 }, true, ['encrypt','decrypt']);
  }
  async function exportAES(key) {
    return new Uint8Array(await crypto.subtle.exportKey('raw', key));
  }
  async function importAES(raw) {
    return crypto.subtle.importKey('raw', raw, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']);
  }

  /* ── ENCRYPT / DECRYPT FILE ── */
  async function encryptFile(buf, aesKey) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, aesKey, buf);
    const out = new Uint8Array(12 + ct.byteLength);
    out.set(iv, 0);
    out.set(new Uint8Array(ct), 12);
    return out;
  }
  async function decryptFile(enc, aesKey) {
    const iv = enc.slice(0, 12);
    const ct = enc.slice(12);
    return crypto.subtle.decrypt({ name:'AES-GCM', iv }, aesKey, ct);
  }

  /* ── WRAP / UNWRAP AES KEY WITH RSA ── */
  async function wrapAES(aesKey, pubKey) {
    const raw = await exportAES(aesKey);
    const wrapped = await crypto.subtle.encrypt({ name:'RSA-OAEP' }, pubKey, raw);
    return b64(wrapped);
  }
  async function unwrapAES(wrappedB64, privKey) {
    const raw = await crypto.subtle.decrypt({ name:'RSA-OAEP' }, privKey, unb64(wrappedB64));
    return importAES(new Uint8Array(raw));
  }

  /* ── FINGERPRINT ── */
  async function fingerprint(pubB64) {
    const hash = await crypto.subtle.digest('SHA-256', unb64(pubB64));
    return new Uint8Array(hash).slice(0, 16);
  }

  /* ── UTILS ── */
  function b64(buf) {
    const bytes = new Uint8Array(buf instanceof ArrayBuffer ? buf : buf.buffer);
    let s = '';
    bytes.forEach(b => s += String.fromCharCode(b));
    return btoa(s);
  }
  function unb64(s) {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out.buffer;
  }
  function randCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }
  function fmtSize(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n/1024).toFixed(1) + ' KB';
    return (n/1048576).toFixed(2) + ' MB';
  }
  function fileIcon(name) {
    const e = name.split('.').pop().toLowerCase();
    return ({pdf:'📄',doc:'📝',docx:'📝',txt:'📃',jpg:'🖼',jpeg:'🖼',png:'🖼',gif:'🖼',
      mp4:'🎬',mov:'🎬',mp3:'🎵',wav:'🎵',zip:'📦',rar:'📦',py:'🐍',
      js:'📜',ts:'📜',html:'🌐',css:'🎨',xlsx:'📊',csv:'📊',pptx:'📽'})[e] || '📄';
  }

  return { genRSA, exportPub, exportPriv, importPub, importPriv,
           genAES, encryptFile, decryptFile, wrapAES, unwrapAES,
           fingerprint, b64, unb64, randCode, fmtSize, fileIcon };
})();
