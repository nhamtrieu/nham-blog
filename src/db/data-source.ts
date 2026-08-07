import "reflect-metadata";

import { DataSource, getMetadataArgsStorage, type DataSourceOptions } from "typeorm";

import { env } from "@/env";
import { appEntities } from "@/entities";

type PostgresDataSourceOptions = Extract<DataSourceOptions, { type: "postgres" }>;
type EntityTargetSnapshot = typeof appEntities;

type TypeOrmGlobalState = {
  dataSource?: DataSource;
  dataSourcePromise?: Promise<DataSource>;
  dataSourceDestroyPromise?: Promise<void>;
  entityTargets?: EntityTargetSnapshot;
};

const globalForTypeOrm = globalThis as typeof globalThis & {
  __nhamTypeOrm?: TypeOrmGlobalState;
};

function getGlobalState(): TypeOrmGlobalState {
  if (!globalForTypeOrm.__nhamTypeOrm) {
    globalForTypeOrm.__nhamTypeOrm = {};
  }

  return globalForTypeOrm.__nhamTypeOrm;
}

/**
 * Next.js production minify mangles class names (Comment -> "h").
 * TypeORM keys entity metadata by constructor.name, so mangled duplicates
 * look like self-cycles ("h -> h"). Pin each class name to @Entity({ name }).
 *
 * Re-runs on every call so HMR-reloaded class constructors get pinned too.
 */
function pinEntityClassNames() {
  for (const table of getMetadataArgsStorage().tables) {
    if (typeof table.target !== "function" || !table.name) {
      continue;
    }

    Object.defineProperty(table.target, "name", {
      value: table.name,
      configurable: true,
    });
  }
}

function requireDatabaseUrl() {
  if (!env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required to initialize TypeORM. Add it to .env.local before calling the database layer."
    );
  }

  return env.DATABASE_URL;
}

function hasEntityTargetsChanged(
  previousTargets: EntityTargetSnapshot | undefined,
  nextTargets: EntityTargetSnapshot
) {
  if (!previousTargets || previousTargets.length !== nextTargets.length) {
    return true;
  }

  // HMR reloads entity modules with new class identities; TypeORM metadata is keyed
  // by those identities, so a rebuild is required even when table names are unchanged.
  return previousTargets.some((target, index) => target !== nextTargets[index]);
}

function isPoolAlreadyEndedError(error: unknown) {
  return error instanceof Error && error.message.includes("Called end on pool more than once");
}

function isConnectionTerminatedError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message;
  return (
    message.includes("Connection terminated") ||
    message.includes("Connection terminated unexpectedly") ||
    message.includes("Client has encountered a connection error") ||
    message.includes("cannot acquire a connection")
  );
}

function isStaleEntityMetadataError(error: unknown) {
  return error instanceof Error && error.message.includes("No metadata for");
}

async function destroyDataSourceSafely(state: TypeOrmGlobalState) {
  if (!state.dataSource || !state.dataSource.isInitialized) {
    return;
  }

  if (!state.dataSourceDestroyPromise) {
    state.dataSourceDestroyPromise = state.dataSource.destroy().catch((error) => {
      if (!isPoolAlreadyEndedError(error)) {
        throw error;
      }
    });
  }

  try {
    await state.dataSourceDestroyPromise;
  } finally {
    state.dataSourceDestroyPromise = undefined;
  }
}

/**
 * HMR swaps entity class identity mid-request. Destroying the pool immediately
 * kills in-flight queries ("Connection terminated"). Detach first, let callers
 * finish on the old pool, then destroy after a short grace period.
 */
function detachDataSourceForRebuild(state: TypeOrmGlobalState) {
  const previous = state.dataSource;
  state.dataSource = undefined;
  state.dataSourcePromise = undefined;
  state.entityTargets = undefined;

  if (!previous?.isInitialized) {
    return;
  }

  // ponytail: single-process HMR only; ceiling = orphaned pools if destroy fails silently
  setTimeout(() => {
    void previous.destroy().catch((error) => {
      if (!isPoolAlreadyEndedError(error)) {
        console.error("[typeorm] deferred destroy failed", error);
      }
    });
  }, 5_000);
}

export function createDataSourceOptions(
  overrides: Partial<PostgresDataSourceOptions> = {}
): PostgresDataSourceOptions {
  pinEntityClassNames();

  return {
    type: "postgres",
    url: requireDatabaseUrl(),
    synchronize: false,
    migrationsRun: false,
    logging: env.NODE_ENV === "development" ? ["error", "schema", "warn"] : ["error"],
    entities: appEntities,
    migrations: [],
    subscribers: [],
    // Remote Postgres (e.g. over Tailscale): keepAlive so idle NAT drops are rarer.
    extra: {
      max: env.NODE_ENV === "development" ? 5 : 10,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
    },
    ...overrides,
  };
}

export function createDataSource(overrides: Partial<PostgresDataSourceOptions> = {}) {
  return new DataSource(createDataSourceOptions(overrides));
}

export function getDataSource() {
  const state = getGlobalState();

  if (!state.dataSource) {
    state.dataSource = createDataSource();
    state.entityTargets = [...appEntities];
  }

  return state.dataSource;
}

export async function initializeDataSource() {
  const state = getGlobalState();

  if (state.dataSource && hasEntityTargetsChanged(state.entityTargets, appEntities)) {
    detachDataSourceForRebuild(state);
  }

  const dataSource = getDataSource();

  if (dataSource.isInitialized) {
    return dataSource;
  }

  if (!state.dataSourcePromise) {
    state.dataSourcePromise = dataSource
      .initialize()
      .catch((error) => {
        state.dataSource = undefined;
        state.entityTargets = undefined;
        throw error;
      })
      .finally(() => {
        state.dataSourcePromise = undefined;
      });
  }

  return state.dataSourcePromise;
}

/** Drop the pool and re-init. Used after remote DB / Tailscale drops a live connection. */
export async function reinitializeDataSource() {
  await destroyDataSource();
  return initializeDataSource();
}

/**
 * Run a DB operation; on dead connection or HMR-stale entity metadata, rebuild once and retry.
 */
export async function withDataSource<T>(fn: (dataSource: DataSource) => Promise<T>): Promise<T> {
  try {
    return await fn(await initializeDataSource());
  } catch (error) {
    if (!isConnectionTerminatedError(error) && !isStaleEntityMetadataError(error)) {
      throw error;
    }

    await reinitializeDataSource();
    return fn(await initializeDataSource());
  }
}

export async function destroyDataSource() {
  const state = getGlobalState();

  if (!state.dataSource) {
    return;
  }

  await destroyDataSourceSafely(state);
  state.dataSource = undefined;
  state.dataSourcePromise = undefined;
  state.entityTargets = undefined;
}

export { isConnectionTerminatedError };
