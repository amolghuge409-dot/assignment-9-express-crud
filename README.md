# Assignment 9 — Express CRUD REST API

A small people directory demonstrating Create, Read, Update and Delete with an Express REST API and a responsive frontend. The frontend calls the API over HTTP; it does not use mock data or browser storage.

## Run locally

Requirements: Node.js 20 or newer.

```bash
cd backend
npm install
npm start
```

Open `http://localhost:3000` to use the frontend served by Express. The frontend calls the same server for the API.

## REST API

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | API health check |
| `GET` | `/api/users` | List people |
| `GET` | `/api/users/:id` | Get a person |
| `POST` | `/api/users` | Create a person |
| `PUT` | `/api/users/:id` | Replace a person's details |
| `DELETE` | `/api/users/:id` | Delete a person |

Send JSON for `POST` and `PUT`:

```json
{
  "name": "Alex Morgan",
  "email": "alex@example.com",
  "age": 24
}
```

The API validates input, prevents duplicate email addresses, and returns JSON errors with appropriate HTTP status codes. It starts with three sample people and stores data in memory; restarting the API resets the sample data.

Run the API tests with `cd backend && npm test`.

## Deploy

This repository is ready to publish as its own GitHub repository (for example, `assignment-9-express-crud`).

1. Push the contents of this folder to the `main` branch of a new GitHub repository.
2. In Render, create a **Blueprint** from that repository and apply `render.yaml` to deploy the Express API. Copy the deployed service URL.
3. In the GitHub repository, add the Actions variable `API_BASE_URL` with the Render URL (for example, `https://assignment-9-crud-api.onrender.com`).
4. In **Settings → Pages**, set the source to **GitHub Actions**. The included workflow publishes the `frontend/` directory on pushes to `main`.

GitHub Pages only hosts static sites; it cannot run the Express server. The Pages workflow publishes the UI, while the separately deployed Render service supplies the REST API. The API's default CORS policy is open for this educational demo; set Render's `ALLOWED_ORIGINS` environment variable to the exact Pages origin for a restricted deployment.
