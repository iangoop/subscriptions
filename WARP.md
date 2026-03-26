# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Root npm scripts and tooling

The repo is a private npm workspace monorepo (`package.json` at the root) with three workspaces under `packages/*`:

- `@subscriptions/functions` – Firebase Cloud Functions (subscription engine)
- `@subscriptions/microservices` – Fastify HTTP API over Firestore
- `@subscriptions/pilot` – React SPA (Create React App + CRACO)

Key root scripts (`package.json`):

- Start full dev stack (functions + microservices + pilot, with TypeScript watch builds):
  - `npm run dev`
- Start individual workspaces in dev:
  - `npm run dev:functions`
  - `npm run dev:microservices`
  - `npm run dev:pilot`
- Build artifacts for deployment:
  - `npm run build:functions`
  - `npm run build:microservices`
  - `npm run build:pilot`
  - `npm run build:pilot:dev` (pilot build with secrets/vars loaded via `dotenvx`)
- Run Jest test suites (TypeScript via `ts-jest` with `tsconfig.test.json`):
  - All unit tests (non-DB): `npm test`
  - DB-related tests (with `.db.test.ts` suffix): `npm run test:database`
  - Run a single Jest test file (example):
    - `npm test -- packages/functions/test/events/subscriptions.test.ts`
    - `npm run test:database -- packages/functions/test/events/subscriptions.db.test.ts`
- Firebase emulators (loads `.secrets` and `.vars` through `dotenvx`):
  - `npm run emulators`

> Note: root tests and builds assume `env/test.env`, `.secrets`, and `.vars` are present; see `README.md` for how these are used with `act` and `dotenvx`.

## Workspace-level scripts

### `packages/functions` (Firebase Functions)

`packages/functions/package.json`:

- Lint: `npm run lint` (ESLint over `.js`/`.ts`)
- Build once / watch: `npm run build`, `npm run build:watch`
- Local Cloud Functions emulation:
  - `npm run serve` – build then `firebase emulators:start --only functions`
  - `npm run shell` / `npm start` – build then `firebase functions:shell`
- Deploy & logs:
  - `npm run deploy` – `firebase deploy --only functions`
  - `npm run logs` – `firebase functions:log`
- Functions-only tests (same Jest config as root):
  - `npm test`

Firebase deployment (`firebase.json`) configures this directory as the primary `functions` codebase and runs `npm --prefix "$RESOURCE_DIR" run lint` and `run build` as predeploy hooks.

### `packages/microservices` (Fastify API)

`packages/microservices/package.json`:

- Build TS + path aliases: `npm run build` (`tsc && tsc-alias`)
- Watch build: `npm run build:watch`
- Local dev server (Fastify, nodemon, env via `dotenvx`):
  - `npm run dev`
- Run compiled server: `npm start`
- Lint source and tests: `npm run lint`, `npm run lint:tests`

`MICROSERVICES_USE_FASTIFY_SERVER=true` controls whether the Fastify server runs as a standalone HTTP server or is wrapped as a Firebase HTTPS function (see `src/index.ts`).

### `packages/pilot` (React SPA)

`packages/pilot/package.json`:

- Dev server:
  - `npm run dev` – CRA dev via CRACO, with `.secrets` / `.vars` loaded through `dotenvx`
  - `npm start` – plain `craco start`
- Build:
  - `npm run build`
  - `npm run dev:build` – build with env from `.secrets` / `.vars`
- Tests (React Testing Library / Jest): `npm test`
- Lint: `npm run lint`

The pilot build output (`packages/pilot/build`) is used by Firebase Hosting target `pilot` (see `firebase.json`).

## High-level architecture

### Overall system

This repository hosts a subscription and delivery management system built on Firebase. It is composed of three main layers:

1. **Firebase Functions core (packages/functions)** – authoritative subscription/delivery engine: triggers, scheduling, planning, and migrations, all on top of Firestore.
2. **Microservices API (packages/microservices)** – Fastify-based HTTP API that exposes CRUD endpoints and subscription operations over Firestore, reusing the Firebase Functions engine for complex scheduling logic.
3. **Pilot UI (packages/pilot)** – React SPA that calls the microservices API for customer, product, and subscription-management flows.

Firebase configuration (`firebase.json`) ties these pieces together:

- Functions codebase `default` → `packages/functions`
- Functions codebase `microservices` → `packages/microservices`
- Hosting `pilot` → `packages/pilot/build` with SPA rewrites

### Subscription & delivery model (Functions core)

The heart of the domain lives in `packages/functions/src/db/subscriptions.ts` and `packages/functions/src/util/subscriptions.ts`:

- **Core types**:
  - `Subscription`, `SubscriptionDb`, `SubscriptionApp` – subscription documents with fields like `schedule` (e.g. `"2W"` or `"1M"`), `orderDate`, `previousOrderDate`, `status` (`SubscriptionStatus`), and billing/shipping references.
  - `Delivery`, `DeliveryDb`, `DeliveryApp` – delivery documents with `status` (`DeliveryStatus`), `orderDate`, `paymentInfo` entries, and the `isFirstDelivery` flag.
- **Firestore converters**: `subscriptionDbConverter` and `deliveryDbConverter` map between Firestore data and strongly-typed models.
- **Query helpers**:
  - `getActiveSubscriptions` – active subscriptions ordered by `orderDate`, optionally for a single shipping address.
  - `getActiveDeliveries` / `getOngoingDeliveriesForCustomer` – active or in-flight deliveries for a customer/address.
  - `getSubscriptionsFromActiveDeliveries`, `getSubscription`, `getSubscriptions` – resolve IDs into typed objects.
- **Delivery linkage**:
  - `persistSubscriptionToDelivery` – creates an immutable snapshot subscription (`OnGoing` status), ensures the corresponding `deliveries` doc exists (via `createDeliveryIfNotExists`), and attaches the subscription ID into `paymentInfo`.
  - `removeSubscriptionFromDelivery` and `findDeliveryContaningSubscription` – manage and locate references.
- **Scheduling & freeze window**:
  - `getFreezeTimeInDays` – reads configuration from `configurations` collection via `ConfigurationKeys.subscriptionFreezeTimeInDays`.
  - `util/subscriptions.ts` exposes:
    - `getNextScheduledDate` / `getPreviousScheduledDate` – interpret `\d+[MW]` schedules (weekly vs. monthly with “nth weekday” semantics).
    - `isOrderDateFrozen` – checks when the freeze window has started.
    - `getNextFormattedSubscriptionScheduledDate`, `strToDate`, `dateToStr`, `today` – date utilities to keep everything normalized to `DATE_FORMAT`.

These functions are extensively exercised in `packages/functions/test/events` and `packages/functions/test/requests`, where in-memory lists and Firestore test helpers simulate end-to-end scheduling and delivery scenarios.

### Event-driven processing & first-time delivery

The main Firestore-triggered and scheduled logic is in:

- `packages/functions/src/db/events/subscriptions.f.ts`
- `packages/functions/src/db/schedule/subscriptions.f.ts`

Key responsibilities:

- **Firestore `onDocumentWritten` triggers**:
  - `onSubscriptionWritten` – when a `subscriptions/{subscriptionId}` doc is created/updated, `processSubscriptionTransaction` decides whether delivery processing is needed and, if so, calls `scheduleSubscription`.
  - `onDeliveryWritten` – when a `deliveries/{deliveryId}` doc changes to `DeliveryStatus.Processing`, `processDelivery` advances `orderDate` and `previousOrderDate` for all associated subscriptions.
- **Scheduling pipeline** (`scheduleSubscription`):
  - Validates that `orderDate` is not in the past (`isSubscriptionDateValid`).
  - Looks up `freezeTimeInDays` via configuration.
  - If the subscription has no `orderDate`, determines if this is a **first-time delivery** using `isFirstTimeDelivery`.
    - If first-time: sets `orderDate` to today and creates a delivery via `createFirstTimeDelivery` with `isFirstDelivery: true`.
    - Otherwise: computes the best-fitting future slot by analyzing existing active subscriptions with `findMatchingDateForSubscription`.
  - If the resolved `orderDate` is within the freeze window, immediately persists a snapshot subscription to the delivery (`persistSubscriptionToDelivery`) and advances `orderDate` to the next scheduled date.
  - Finally persists the updated subscription via `updateSubscription`.
- **First-time delivery semantics** (`isFirstTimeDelivery` / `createFirstTimeDelivery`):
  - Implement the design described in `docs/adr/adr-001-first-time-delivery.md`.
  - Rather than inspecting only active subscriptions, the system:
    - Checks both active subscriptions and active deliveries for the customer/address.
    - Treats the combination of `activeSubscriptions.length === 0 && activeDeliveries.length === 0` as first-time.
    - Uses the `isFirstDelivery` flag on deliveries (set at creation time) to identify first-delivery shipments whose `orderDate` is today.

The scheduled job and webhook in `db/schedule/subscriptions.f.ts` manage day-level processing:

- `processDayDeliveries` (via `onSchedule('every day 06:00', ...)`) runs:
  - `processActiveDeliveries` – finds all active deliveries with `orderDate <= today` and moves them to `WaitingPayment`.
  - `processActiveSubscriptions` – finds active subscriptions within the freeze window, persists them into deliveries, and advances their `orderDate`.
- `handlePaymentWebhook` (HTTP `onRequest`) updates deliveries to `Processing` or `Failed` based on payment provider callbacks and increments error/attempt counters inside `paymentInfo`.

### HTTP endpoints in Functions (Express app)

Beyond triggers, the Functions layer also exposes HTTP endpoints under an Express app (see `packages/functions/src/requests/subscriptions.f.ts`):

- `/next-scheduled-date` – compute the next scheduled date given an ISO date and `\d+[MW]` schedule, with validation via `@sinclair/typebox` and a `validateWithMessages` helper.
- `/customer-subscription-planning` – build a multi-month planning view of subscriptions and deliveries for a customer ID, grouped by address and date, including freeze-window metadata.
- `/skip-subscription` – advance a subscription’s `orderDate` by one (or two) schedule steps depending on whether the current date is inside the freeze window.

These endpoints are pure HTTP wrappers over the domain utilities described above, and are consumed indirectly via the microservices layer.

### Microservices API layer

The microservices package (`packages/microservices`) is a Fastify-based API sitting on top of the Firebase web SDK (`firebase/app`, `firebase/firestore`, `firebase/functions`) and the same Firestore database as the Functions layer.

Key pieces:

- **Environment & Firebase configuration**:
  - `src/configurations/EnvVars.ts` – gathers all required configuration from `process.env` (e.g. `MICROSERVICES_USE_FASTIFY_SERVER`, `MICROSERVICES_PORT`, `FUNCTIONS_API_URL`, and a dedicated set of Firebase credentials under `CUSTOM_FIREBASE_*`).
  - `src/configurations/firebase.ts` – initializes the Firebase app, Firestore client, and Functions client; connects to local emulators when `NODE_ENV=development` and provides `firestoreInstance`, `functions`, and `functionsUrl` symbols.
- **Server bootstrap** (`src/index.ts`):
  - If `EnvVars.useFastifyServer` is `true`, starts a standalone Fastify HTTP server listening on `MICROSERVICES_PORT`.
  - Otherwise, wraps Fastify behind a Firebase HTTPS `onRequest` handler, adapting Express-style `Request`/`Response` objects to Fastify.
  - In both modes, exported `app` is the deployed function or HTTP server.
- **Data access & generic CRUD**:
  - `src/helpers/dbfunctions.ts` – central Firestore abstraction:
    - `Timestamped`, `Identified`, `Crud<T>` and related helpers (`validateDoc`, `fromQuery`, pagination helpers, `setCreated`/`setUpdated`).
    - `Crud<T>` powers consistent `getAll`, `getById`, `create`, `update`, `delete`, and `unarchive` operations for documents in a collection.
  - `src/helpers/routes.ts` – Fastify route factories:
    - `crudRest` – mounts REST endpoints (`GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`) for a `Crud<T>` service using TypeBox schemas and optional pagination/query-string schemas.
    - `unarchive` – standardized `PATCH /unarchive/:id` endpoint.
    - `writeErrorsToResponse` – maps `ValidationError` and `InvalidReferenceError` into HTTP responses (400 vs 404).
- **Domain models** (TypeBox schemas that parallel the Functions core types):
  - `src/models/Customer.ts` – `CustomerCollection` and `CustomerSchema` for basic customer identity.
  - `src/models/Subscription.ts` – `SubscriptionCollection`, `SubscriptionSchema`, and associated enums in `Shared.ts`.
  - Similar patterns for `Product`, `Delivery`, and customer addresses.
- **Subscription service** (`src/services/SubscriptionService.ts`):
  - Uses `firestoreInstance` and model converters to perform subscription CRUD and higher-level flows.
  - Delegates to Functions HTTP endpoints (via `fetchCustomerSubscriptionPlan` and `fetchNextScheduledDate` from `services/functions/SubscriptionFunction`) instead of duplicating planning/scheduling rules.
  - Example responsibilities:
    - `createSubscriptionForProduct` – validate with `subscriptionValidator`, then persist to the `subscriptions` collection.
    - `skipSubscription` – checks that the subscription belongs to the given customer, then calls the Functions endpoint to compute the next order date and updates the subscription doc accordingly.
    - `getCustomerSubscriptionPlanning` – calls the Functions planning endpoint, then hydrates it with customer addresses and products data from Firestore to produce a richer payload for the UI.
- **Routing** (`src/routes/**`):
  - `src/routes/subscriptions/customers` – customer CRUD via `crudRest` and `customerService`.
  - `src/routes/subscriptions/products` – product CRUD via `crudRest` and `productService`.
  - `src/routes/subscriptions/subscriptions` – subscription-specific endpoints:
    - `POST /create-subscription` – wraps `SubscriptionService.createSubscriptionForProduct`.
    - `POST /skip-subscription` – wraps `SubscriptionService.skipSubscription`.
    - `POST /customer-subscription-planning` – wraps `SubscriptionService.getCustomerSubscriptionPlanning`.

The microservices layer thus acts as a thin REST API over Firestore that reuses the scheduling engine implemented in Firebase Functions.

### Pilot React app

The pilot app (`packages/pilot`) is a Create React App-based SPA using CRACO to support TypeScript path aliases defined in its `tsconfig.json` (via `TsconfigPathsPlugin` in `craco.config.js`). It provides admin-style UIs for customers, products, and subscriptions.

Key patterns:

- **Environment configuration**:
  - `src/util/EnvVars.ts` – reads `REACT_APP_API_URL`, `REACT_APP_AVATAR_URL`, and `REACT_APP_PLACEHOLDER_URL` to configure API and assets. The API URL must point at the microservices HTTP base.
- **Domain types (mirroring backend)**:
  - `src/shared/types/model.ts` – defines `Product`, `Customer`, `CustomerAddress`, `Subscription`, `Delivery`, `SubscriptionPlanningRecord`, etc., matching microservices/Functions shapes closely enough for type-safe API integration.
  - `src/shared/types/crud.ts` – `ById` type and `CREATE` sentinel for routing new vs existing entities.
- **Generic CRUD controller** (`src/controllers/CommonController.ts`):
  - Defines `ObjectManagement<T>` – encapsulates axios-based calls to the microservices API for a given `serviceUrl` (e.g. `customers`, `products`).
  - `formStateManagement<T>` – React hook that:
    - Loads an object by ID (when editing).
    - Manages form submission (create vs update), deletion, and unarchive operations.
    - Manages common UI state flags (loading, confirmation, errors, success) and navigates after create.
- **Entity-specific controllers**:
  - `CustomerController.ts` – wraps `formStateManagement` for customer forms using the `CustomerSchema` validators.
  - `ProductController.ts` – similar but for product forms using `ProductSchema`.
- **Subscription planning UI** (`CustomerSubscriptionsPlanController.ts`):
  - Reads `customerId` from the route.
  - Calls `${EnvVars.apiUrl}/subscriptions/customer-subscription-planning` to fetch the planning payload produced by `SubscriptionService.getCustomerSubscriptionPlanning` in the microservices layer (ultimately backed by Functions planning logic).
  - Maintains selected address and the currently-open “skip subscription” pane, and issues `POST` requests to the microservices `subscriptions/skip-subscription` endpoint.

Routing and page composition are organized under `src/pages` (e.g. `customers/Customers`, `products/Products`, `Layout`, `Home`), and these controllers are wired into components under `src/components`.

### ADRs and design documents

Architecture decisions that affect the subscription pipeline and Firestore data model may be documented under `docs/adr`. The current ADR (`docs/adr/adr-001-first-time-delivery.md`) describes the rationale for the `isFirstDelivery` flag and the `isFirstTimeDelivery` logic in `packages/functions/src/db/events/subscriptions.f.ts` and `packages/functions/src/db/subscriptions.ts`.

When changing first-time delivery, scheduling, or subscription planning logic, cross-check the ADR and update it if the underlying behavior changes.
