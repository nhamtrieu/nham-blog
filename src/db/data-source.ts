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
  entityNamesPinned?: boolean;
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
 */
function pinEntityClassNames() {
  const state = getGlobalState();

  if (state.entityNamesPinned) {
    return;
  }

  for (const table of getMetadataArgsStorage().tables) {
    if (typeof table.target === "function" && table.name) {
      Object.defineProperty(table.target, "name", { value: table.name });
    }
  }

  state.entityNamesPinned = true;
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

  return previousTargets.some((target, index) => target !== nextTargets[index]);
}

function isPoolAlreadyEndedError(error: unknown) {
  return error instanceof Error && error.message.includes("Called end on pool more than once");
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
    extra: {
      max: env.NODE_ENV === "development" ? 5 : 10,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 20_000,
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
    await destroyDataSourceSafely(state);
    state.dataSource = undefined;
    state.dataSourcePromise = undefined;
    state.entityTargets = undefined;
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
