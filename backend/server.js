const cors = require('cors');
const express = require('express');
const { randomUUID } = require('node:crypto');
const path = require('node:path');

const initialUsers = [
  { id: '1', name: 'Aarav Sharma', email: 'aarav@example.com', age: 21 },
  { id: '2', name: 'Priya Verma', email: 'priya@example.com', age: 23 },
  { id: '3', name: 'Kabir Khan', email: 'kabir@example.com', age: 20 },
];

function createApp({ users = initialUsers.map((user) => ({ ...user })) } = {}) {
  const app = express();

  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
      : '*',
  }));
  app.use(express.json({ limit: '10kb' }));
  app.use(express.static(path.resolve(__dirname, '../frontend')));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/users', (_req, res) => {
    res.json({ data: users });
  });

  app.get('/api/users/:id', (req, res) => {
    const user = users.find((entry) => entry.id === req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ data: user });
  });

  app.post('/api/users', (req, res) => {
    const validation = validateUser(req.body);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }
    if (users.some((user) => user.email.toLowerCase() === validation.user.email.toLowerCase())) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    const user = { id: randomUUID(), ...validation.user };
    users.push(user);
    return res.status(201).json({ data: user });
  });

  app.put('/api/users/:id', (req, res) => {
    const index = users.findIndex((entry) => entry.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validation = validateUser(req.body);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }
    if (users.some((user) => (
      user.id !== req.params.id
      && user.email.toLowerCase() === validation.user.email.toLowerCase()
    ))) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    users[index] = { id: req.params.id, ...validation.user };
    return res.json({ data: users[index] });
  });

  app.delete('/api/users/:id', (req, res) => {
    const index = users.findIndex((entry) => entry.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    users.splice(index, 1);
    return res.status(204).end();
  });

  app.use((error, _req, res, _next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
      return res.status(400).json({ error: 'Request body must be valid JSON' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

function validateUser(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be a JSON object' };
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const age = Number(body.age);

  if (!name || name.length > 80) {
    return { error: 'Name is required and must be 80 characters or fewer' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { error: 'A valid email address is required' };
  }
  if (!Number.isInteger(age) || age < 1 || age > 120) {
    return { error: 'Age must be a whole number between 1 and 120' };
  }

  return { user: { name, email, age } };
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => {
    console.log(`Assignment 9 API listening on port ${port}`);
  });
}

module.exports = { createApp };
