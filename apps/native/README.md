# Netwatch Native (`@netwatch/native`)

The mobile client for **Netwatch**, built with **Expo SDK 58**, **React Native 0.88**, **Expo Router**, **NativeWind v4**, and shared workspace models from **`@netwatch/core`**.

---

## Features & Web Parity

- **Hero Billboard (`HomeBillboard`)**: Full-bleed cinema artwork, live uplink badge (`LIVE UPLINK` / `ARCHIVE VAULT`), format badge (`4K HDR`), match percentage, 3-button action bar (`▶ Play`, `✓/＋ My List`, `ⓘ Info`).
- **Live Genre Micro-Slicing (`GenreFilterBar`)**: Horizontal filter chips on Home, Movies, and TV that query `/api/discover` live without reloading the feed.
- **Continue Watching & Progress Sync**: 16:9 backdrop cards with episode badge (`S1 • E2`), bottom progress bar, and automatic 12-second playback progress syncing via `/api/history/[mediaId]`.
- **Regional Charts & Region Selector (`RegionSelector`)**: Interactive country pills (`US`, `IN`, `GB`, `CA`, `AU`, `KR`, `JP`, `DE`, `FR`, `ES`, `MX`, `BR`) persisted in `AsyncStorage`.
- **Title Detail Screen (`/movie/[id]` & `/tv/[id]`)**: Full synopsis, match score, runtime/seasons, server readiness badge, native Share sheet, interactive Season/Episode switcher for TV shows, Cast & Crew rail, and "More Like This" recommendations.
- **Universal Live Search (`/(tabs)/search`)**: 260ms debounced search as you type, clear button, category tabs (`All Matches`, `Movies`, `TV Shows`), quick discovery tags, **Top Matches** feature cards, and **Explore All Results** grid with pagination.
- **Reactive Watchlist (`WatchlistContext` & `/(tabs)/watchlist`)**: Optimistic add/remove synced across `/api/watchlist` and `AsyncStorage` offline cache, bottom tab badge counter, and `All / Movies / TV Shows` filter tabs.
- **Multi-Source Watch Player (`/watch/[type]/[id]`)**: Direct HLS playback via `expo-video` (with formatted clock, scrubbing, `±10s` double-tap seek with haptics) + automatic fallback and live server/episode switching modal for Embed Relays.
- **Dual Cinema Themes**: Defaults to **Obsidian** dark theme (`#131313` / `#b0c6ff`) with instant toggle to **Luminous** light theme (`#f8f9ff` / `#004ac6`).

---

## Local Development (Zero-Conflict Orchestration)

Run from either `netwatch/` (workspace root) or `netwatch/apps/native/`:

```bash
pnpm android        # Auto-starts Braindance (:8001), Netwatch Next.js (:3000..3002), boots Android Emulator, sets adb reverse, and opens app
pnpm dev:native     # Starts backend + Next.js + Metro bundler
pnpm ios            # Starts backend + Next.js + iOS Simulator (macOS) or Expo Go
```

### Conflict-Free Runtime API Probing
No manual `EXPO_PUBLIC_NETWATCH_URL` configuration is needed for local development:
1. `scripts/dev-native.mjs` checks if Netwatch Next.js is already running on `:3000..3002` by verifying `GET /api/health` returns `{ "service": "netwatch" }`.
2. If `:3000` is occupied by another local project, `dev-native.mjs` automatically starts Netwatch on `:3001` (or `:3002`) and configures `adb reverse` for all candidate ports.
3. Inside the app, `src/lib/config.ts` probes `127.0.0.1`, `10.0.2.2`, `localhost`, and Metro's `hostUri` across candidate ports and locks onto the verified Netwatch BFF instance.

---

## Multi-Environment & Production Build Setup

Configuration is driven dynamically by `app.config.ts`, `eas.json`, and `scripts/build-native.mjs` across three isolated environments:

| Environment | `APP_ENV` | App Name | Package / Bundle ID | URL Scheme | Android Artifact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Development** | `development` | `Netwatch (Dev)` | `com.afterlife.netwatch.dev` | `netwatch-dev` | Debug / Dev Client APK |
| **Staging** | `staging` | `Netwatch (Staging)` | `com.afterlife.netwatch.staging` | `netwatch-staging` | Internal Preview APK |
| **Production** | `production` | `Netwatch` | `com.afterlife.netwatch` | `netwatch` | Play Store AAB / App Store IPA |

### Scripts Reference (`package.json`)

| Command (from `netwatch/`) | Command (from `apps/native/`) | Description |
| :--- | :--- | :--- |
| `pnpm dev:web` | — | Start Next.js 16 web server |
| `pnpm dev:native` | `pnpm start` | Start Braindance + Next.js + Expo Metro |
| `pnpm android` | `pnpm android` | Boot Android Emulator + `adb reverse` + launch app |
| `pnpm typecheck:all` | `pnpm typecheck` | Typecheck web + mobile workspaces |
| `pnpm lint:all` | `pnpm lint` | Lint web + mobile workspaces |
| `pnpm native:config:prod` | `pnpm config:prod` | Inspect resolved `app.config.ts` for production |
| `pnpm build:native:dev` | `pnpm build:bundle:dev` | Export local development JS/assets bundle (`dist-development/`) |
| `pnpm build:native:staging` | `pnpm build:bundle:staging` | Export local staging JS/assets bundle (`dist-staging/`) |
| `pnpm build:native:prod` | `pnpm build:bundle:prod` | Export local production JS/assets bundle (`dist-production/`) |
| `pnpm eas:build:dev` | `pnpm eas:build:dev` | Build development client on EAS |
| `pnpm eas:build:staging` | `pnpm eas:build:staging` | Build internal staging APK/IPA on EAS |
| `pnpm eas:build:prod` | `pnpm eas:build:prod` | Build store-ready production AAB/IPA on EAS |
| `pnpm test:e2e:android` | `pnpm test:e2e:android` | Run automated Android Emulator UI/UX E2E verification suite |
