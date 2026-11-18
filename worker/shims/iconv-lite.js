'use strict';
// Minimal iconv-lite replacement for the Worker bundle.
// body-parser/raw-body only need getDecoder/decode/encode for request bodies;
// workerd's TextDecoder covers the charsets our API actually receives.

function normEnc(enc) {
    const e = String(enc || 'utf-8').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (e === 'utf8' || e === 'utf8bom') return 'utf-8';
    if (e === 'utf16le' || e === 'ucs2') return 'utf-16le';
    if (e === 'latin1' || e === 'binary' || e === 'iso88591' || e === 'ascii') return 'latin1';
    return 'utf-8';
}

function decode(buf, enc) {
    const e = normEnc(enc);
    if (e === 'latin1') {
        // latin1: each byte maps to a code point
        const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
        let s = '';
        for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
        return s;
    }
    return new TextDecoder(e).decode(buf);
}

function encode(str, enc) {
    const e = normEnc(enc);
    if (e === 'latin1') {
        const out = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff;
        return Buffer.from(out);
    }
    return Buffer.from(new TextEncoder().encode(str));
}

function getDecoder(enc) {
    const e = normEnc(enc);
    if (e === 'latin1') {
        let acc = '';
        return {
            write(buf) { acc += decode(buf, e); return acc; },
            end(buf) { if (buf && buf.length) acc += decode(buf, e); return acc; }
        };
    }
    const td = new TextDecoder(e);
    return {
        write(buf) { return td.decode(buf, { stream: true }); },
        end(buf) { return td.decode(buf || new Uint8Array(0)); }
    };
}

function encodingExists(enc) {
    const e = normEnc(enc);
    try { new TextDecoder(e); return true; } catch (_) { return e === 'latin1'; }
}

module.exports = { decode, encode, getDecoder, encodingExists };
