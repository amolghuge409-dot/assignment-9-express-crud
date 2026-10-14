const assert = require('node:assert/strict');
const { afterEach, beforeEach, describe, it } = require('node:test');
const { createApp } = require('./server');

describe('Assignment 9 users REST API', () => {
  let server;
  let baseUrl;

  beforeEach(async () => {
    server = createApp({ users: [] }).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterEach(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('creates, reads, updates, and deletes a user', async () => {
    const createdResponse = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email: 'TEST@example.com', age: 25 }),
    });
    assert.equal(createdResponse.status, 201);
    const { data: created } = await createdResponse.json();
    assert.match(created.id, /^[0-9a-f-]{36}$/);
    assert.equal(created.email, 'test@example.com');

    const readResponse = await fetch(`${baseUrl}/api/users/${created.id}`);
    assert.equal(readResponse.status, 200);
    assert.equal((await readResponse.json()).data.name, 'Test User');

    const updatedResponse = await fetch(`${baseUrl}/api/users/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated User', email: 'updated@example.com', age: 26 }),
    });
    assert.equal(updatedResponse.status, 200);
    assert.equal((await updatedResponse.json()).data.name, 'Updated User');

    const deletedResponse = await fetch(`${baseUrl}/api/users/${created.id}`, {
      method: 'DELETE',
    });
    assert.equal(deletedResponse.status, 204);
    assert.equal((await fetch(`${baseUrl}/api/users/${created.id}`)).status, 404);
  });

  it('rejects invalid data and duplicate email addresses', async () => {
    const invalidResponse = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', email: 'not-an-email', age: -1 }),
    });
    assert.equal(invalidResponse.status, 400);

    const payload = { name: 'First User', email: 'same@example.com', age: 22 };
    assert.equal((await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })).status, 201);

    const duplicateResponse = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, name: 'Second User', email: 'SAME@example.com' }),
    });
    assert.equal(duplicateResponse.status, 409);
  });

  it('returns a health status and an empty list', async () => {
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    assert.equal((await healthResponse.json()).status, 'ok');
    const usersResponse = await fetch(`${baseUrl}/api/users`);
    assert.deepEqual((await usersResponse.json()).data, []);
  });
});
