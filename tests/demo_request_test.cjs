'use strict';

const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.RESEND_API_KEY = 'test-only-key';
process.env.FROM_EMAIL = 'Creator Cash Flow <demo@example.com>';
process.env.DEMO_PUBLIC_URL = 'https://example.com/#journey';
process.env.DEMO_REQUEST_INBOX = 'owner@example.com';

const nativeFetch = global.fetch;
const delivered = [];
global.fetch = async (url, options) => {
  if (String(url).endsWith('/emails')) {
    delivered.push(JSON.parse(options.body));
    return { ok: true, status: 200 };
  }
  return nativeFetch(url, options);
};

const { app } = require('../server');

(async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = async body => {
    const response = await fetch(`${base}/api/demo-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return { status: response.status, body: await response.json() };
  };
  try {
    assert.equal((await post({ name: 'A', email: 'bad' })).status, 400);
    assert.equal((await post({ name: 'Bot', email: 'bot@example.com', website: 'spam' })).status, 202);
    assert.equal(delivered.length, 0);
    const result = await post({ name: '  Jane   Agency  ', email: 'Jane@Example.com' });
    assert.equal(result.status, 202);
    assert.match(result.body.message, /inbox/i);
    assert.equal(delivered.length, 2);
    assert.equal(delivered[0].to, 'jane@example.com');
    assert.match(delivered[0].text, /https:\/\/example.com\/#journey/);
    assert.equal(delivered[1].to, 'owner@example.com');
    console.log('Demo request route: validation, honeypot, visitor email and owner notification passed.');
  } finally {
    server.close();
    global.fetch = nativeFetch;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
