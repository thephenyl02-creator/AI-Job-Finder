import { db } from "../db";
import { jobs } from "@shared/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";

interface SalaryBenchmark {
  category: string;
  seniorityLevel: string;
  medianMin: number;
  medianMax: number;
  currency: string;
  sampleSize: number;
}

let cachedBenchmarks: SalaryBenchmark[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000;

export async function getSalaryBenchmarks(): Promise<SalaryBenchmark[]> {
  if (cachedBenchmarks && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedBenchmarks;
  }

  const result = await db.execute(sql`
    SELECT 
      role_category,
      seniority_level,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_min) as median_min,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_max) as median_max,
      salary_currency,
      COUNT(*) as sample_size
    FROM jobs
    WHERE is_published = true
      AND salary_min IS NOT NULL
      AND salary_max IS NOT NULL
      AND salary_min > 0
      AND salary_max > 0
      AND role_category IS NOT NULL
      AND seniority_level IS NOT NULL
      AND salary_currency = 'USD'
    GROUP BY role_category, seniority_level, salary_currency
    HAVING COUNT(*) >= 3
    ORDER BY role_category, seniority_level
  `);

  const rows = (result as any).rows || [];
  cachedBenchmarks = rows.map((r: any) => ({
    category: r.role_category,
    seniorityLevel: r.seniority_level,
    medianMin: Math.round(Number(r.median_min) / 1000) * 1000,
    medianMax: Math.round(Number(r.median_max) / 1000) * 1000,
    currency: r.salary_currency || 'USD',
    sampleSize: Number(r.sample_size),
  }));
  cacheTimestamp = Date.now();

  return cachedBenchmarks;
}

export function estimateSalary(
  benchmarks: SalaryBenchmark[],
  category: string | null,
  seniorityLevel: string | null
): { min: number; max: number; isEstimate: true } | null {
  if (!category || !seniorityLevel) return null;

  const exact = benchmarks.find(
    b => b.category === category && b.seniorityLevel === seniorityLevel
  );
  if (exact) {
    return { min: exact.medianMin, max: exact.medianMax, isEstimate: true };
  }

  const byCategory = benchmarks.filter(b => b.category === category);
  if (byCategory.length > 0) {
    const avgMin = Math.round(byCategory.reduce((s, b) => s + b.medianMin, 0) / byCategory.length / 1000) * 1000;
    const avgMax = Math.round(byCategory.reduce((s, b) => s + b.medianMax, 0) / byCategory.length / 1000) * 1000;
    return { min: avgMin, max: avgMax, isEstimate: true };
  }

  return null;
}
