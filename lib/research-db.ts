import "server-only";

import { DuckDBInstance } from "@duckdb/node-api";
import { mkdir } from "node:fs/promises";
import path from "node:path";

export type AssetType = "a-share" | "fund-etf";

export type ResearchNote = {
  id: string;
  assetCode: string;
  assetType: AssetType;
  createdAt: number;
  reason: string;
  observation: string;
  plan: string;
  risk: string;
};

const databasePath = path.join(
  process.cwd(),
  ".local",
  process.env.NODE_ENV === "production"
    ? "research-notes.duckdb"
    : "research-notes.dev.duckdb",
);

let databasePromise: Promise<DuckDBInstance> | undefined;
let writeChain: Promise<void> = Promise.resolve();

async function getDatabase(): Promise<DuckDBInstance> {
  if (!databasePromise) {
    databasePromise = (async () => {
      await mkdir(path.dirname(databasePath), { recursive: true });
      const database = await DuckDBInstance.fromCache(databasePath);
      const connection = await database.connect();

      try {
        await connection.run(`
          CREATE TABLE IF NOT EXISTS research_notes (
            id VARCHAR PRIMARY KEY,
            asset_code VARCHAR NOT NULL,
            asset_type VARCHAR NOT NULL,
            created_at BIGINT NOT NULL,
            reason VARCHAR NOT NULL,
            observation VARCHAR NOT NULL,
            plan VARCHAR NOT NULL,
            risk VARCHAR NOT NULL,
            CHECK (asset_type IN ('a-share', 'fund-etf'))
          )
        `);
      } finally {
        connection.closeSync();
      }

      return database;
    })().catch((error: unknown) => {
      databasePromise = undefined;
      throw error;
    });
  }

  return databasePromise;
}

async function withConnection<T>(operation: (connection: Awaited<ReturnType<DuckDBInstance["connect"]>>) => Promise<T>): Promise<T> {
  const database = await getDatabase();
  const connection = await database.connect();

  try {
    return await operation(connection);
  } finally {
    connection.closeSync();
  }
}

function toResearchNote(row: Record<string, unknown>): ResearchNote {
  return {
    id: String(row.id),
    assetCode: String(row.asset_code),
    assetType: row.asset_type as AssetType,
    createdAt: Number(row.created_at),
    reason: String(row.reason),
    observation: String(row.observation),
    plan: String(row.plan),
    risk: String(row.risk),
  };
}

function enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeChain.then(operation, operation);
  writeChain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export async function listResearchNotes(): Promise<ResearchNote[]> {
  return withConnection(async (connection) => {
    const reader = await connection.runAndReadAll(`
      SELECT id, asset_code, asset_type, created_at, reason, observation, plan, risk
      FROM research_notes
      ORDER BY created_at DESC
    `);
    return reader
      .getRowObjects()
      .map((row) => toResearchNote(row as Record<string, unknown>));
  });
}

export function addResearchNote(note: ResearchNote): Promise<void> {
  return enqueueWrite(() =>
    withConnection(async (connection) => {
      await connection.run(
        `
          INSERT INTO research_notes (
            id, asset_code, asset_type, created_at, reason, observation, plan, risk
          ) VALUES (
            $id, $assetCode, $assetType, $createdAt, $reason, $observation, $plan, $risk
          )
        `,
        note,
      );
    }),
  );
}

export function deleteResearchNote(id: string): Promise<void> {
  return enqueueWrite(() =>
    withConnection(async (connection) => {
      await connection.run("DELETE FROM research_notes WHERE id = $id", { id });
    }),
  );
}

export function replaceResearchNotes(notes: ResearchNote[]): Promise<void> {
  return enqueueWrite(() =>
    withConnection(async (connection) => {
      let transactionStarted = false;

      try {
        await connection.run("BEGIN TRANSACTION");
        transactionStarted = true;
        await connection.run("DELETE FROM research_notes");

        for (const note of notes) {
          await connection.run(
            `
              INSERT INTO research_notes (
                id, asset_code, asset_type, created_at, reason, observation, plan, risk
              ) VALUES (
                $id, $assetCode, $assetType, $createdAt, $reason, $observation, $plan, $risk
              )
            `,
            note,
          );
        }

        await connection.run("COMMIT");
      } catch (error) {
        if (transactionStarted) {
          await connection.run("ROLLBACK").catch(() => undefined);
        }
        throw error;
      }
    }),
  );
}
