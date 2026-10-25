import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

// Global cache for pg.Pool across Next.js dev reloads
declare global {
  // eslint-disable-next-line no-var
  var __jansahayak_pg_pool__: Pool | undefined;
}

const connectionString =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/jansahayak";

export const pool =
  global.__jansahayak_pg_pool__ ||
  new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== "production") {
  global.__jansahayak_pg_pool__ = pool;
}

export const db = drizzle(pool, { schema });

/**
 * Initializes PostGIS extension and ensures the spatial indices are enabled.
 */
export async function initPostgres(): Promise<{ success: boolean; message: string }> {
  try {
    const client = await pool.connect();
    try {
      await client.query("CREATE EXTENSION IF NOT EXISTS postgis;");
      return { success: true, message: "PostgreSQL & PostGIS successfully initialized" };
    } finally {
      client.release();
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, message: `PostgreSQL connection failed: ${msg}` };
  }
}

/**
 * Stage 5 PostGIS Spatial Discovery:
 * Find nearby canonical incidents within a given radius (meters) using ST_DWithin and ST_Distance on geography.
 */
export async function findNearbyIncidents(params: {
  latitude: number;
  longitude: number;
  radiusMeters?: number; // Default 30 meters (PRD Stage 5)
  category?: string;
  excludeIncidentId?: string;
}) {
  const radius = params.radiusMeters || 30.0;
  const { latitude, longitude, category, excludeIncidentId } = params;

  // PostGIS query using ST_DWithin on WGS84 geography
  const query = sql`
    SELECT 
      id,
      incident_number as "incidentNumber",
      category,
      severity,
      status,
      title,
      summary,
      latitude::float as latitude,
      longitude::float as longitude,
      spatial_uncertainty_meters::float as "spatialUncertaintyMeters",
      report_count as "reportCount",
      is_published as "isPublished",
      moderation_status as "moderationStatus",
      created_at as "createdAt",
      ROUND(
        ST_Distance(
          canonical_geom::geography,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
        )::numeric,
        2
      )::float as "distanceMeters"
    FROM incidents
    WHERE 
      canonical_geom IS NOT NULL
      AND ST_DWithin(
        canonical_geom::geography,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
        ${radius}
      )
      ${category ? sql`AND category = ${category}` : sql``}
      ${excludeIncidentId ? sql`AND id != ${excludeIncidentId}::uuid` : sql``}
    ORDER BY "distanceMeters" ASC
    LIMIT 20;
  `;

  const result = await db.execute(query);
  return result.rows as Array<{
    id: string;
    incidentNumber: string;
    category: string;
    severity: string;
    status: string;
    title: string;
    summary: string;
    latitude: number;
    longitude: number;
    spatialUncertaintyMeters: number;
    reportCount: number;
    isPublished: boolean;
    moderationStatus: string;
    createdAt: string;
    distanceMeters: number;
  }>;
}

export * from "./schema";
