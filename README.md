# Bitebook

Bitebook is a premium, dark-mode, image-first social food diary and discovery app
(React Native + Expo + Supabase). Core loop: **Discover → Try → Log → Rate → Share →
Follow → Discover again**.

> **New to this repo, or picking it up on a different machine?** Read
> [`docs/COPILOT_HANDOVER.md`](docs/COPILOT_HANDOVER.md) first — it is the comprehensive,
> up-to-date project handover (architecture, database, auth, environment setup, current
> status, known issues, and next steps). Also see
> [`.github/copilot-instructions.md`](.github/copilot-instructions.md) for the permanent
> working rules for any AI coding assistant on this project.

## Tech Stack

Expo SDK ~57, React Native 0.86, React 19.2, TypeScript ~6.0 (strict), Expo Router ~57,
NativeWind 4 / Tailwind 3, Supabase (PostgreSQL 17 + PostGIS). See
`docs/COPILOT_HANDOVER.md` §2 for full, verified version detail.

## Setup

```bash
npm install
cp .env.example .env   # then fill in real values — see "Environment Variables" below
npx expo start
```

## Environment Variables

Copy `.env.example` to `.env` and set:

- `EXPO_PUBLIC_SUPABASE_URL` — your Supabase project's API URL.
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — your Supabase project's anon/publishable key.

Both are safe to expose client-side (that's what `EXPO_PUBLIC_*` means in Expo). **Never**
put a service-role key or any other private credential in `.env` values that get
committed, or in any `EXPO_PUBLIC_*` variable. `.env` is gitignored and must be
recreated on every machine.

## Development Commands

```bash
npx expo start          # start the dev server
npx expo start --ios    # iOS simulator
npx expo start --web    # web
npx tsc --noEmit        # TypeScript check
npx expo lint           # ESLint
npx expo-doctor         # Expo environment/config health check
```

## Supabase Setup

The backend is a 22-table PostgreSQL schema managed via Supabase CLI migrations in
`supabase/migrations/`. Full detail: `docs/database-architecture.md`.

```bash
npx supabase login
npx supabase link --project-ref discsdmiuatiwtldmcoc   # links to the "Bitebook" project
npx supabase migration list --linked                     # verify schema is in sync
```

Running the local dev stack (`supabase start`, `supabase db reset`) or the pgTAP test
suite (`supabase test db`) requires **Docker Desktop** to be installed and running.

## Testing

```bash
npx tsc --noEmit                    # TypeScript
npx expo lint                       # lint
npx expo-doctor                     # environment health check
npx supabase test db --linked       # pgTAP database/security tests (requires Docker)
```

See `docs/COPILOT_HANDOVER.md` §12/§13 for current pass/fail status and known gaps
(notably: the pgTAP suite has not yet been executed in this project's history due to
Docker not being available in the original development environment).

## Troubleshooting

See `docs/COPILOT_HANDOVER.md` §21 for a detailed troubleshooting guide covering
npm/Expo/Supabase CLI/Docker/environment-variable/auth/migration/TypeScript/Git issues.

---

## Original Expo Template Notes

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
