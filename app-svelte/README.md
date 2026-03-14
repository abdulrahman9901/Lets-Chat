# Lets-Chat (Svelte)

SvelteKit replica of the Lets-Chat frontend (Slack-like): auth, chat list, rooms, messages over WebSocket, create/join chat, add/kick members, image upload, leave/delete chat.

**Routes:** `/` and `/:chatId` (main app), `/login`, `/register`.

**Run:** `npm run dev` then open the URL (e.g. http://localhost:5173). Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` / `VITE_WS_BASE_URL` to your Django backend (default `http://127.0.0.1:8000` / `ws://127.0.0.1:8000`).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@0.12.7 create --template minimal --types ts --install npm app-svelte
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
