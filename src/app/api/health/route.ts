/**
 * API Route: Health Check
 * GET /api/health
 * Endpoint de monitoring pour vérifier l'état de l'application
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: { status: string; latency?: number; error?: string };
    memory: { status: string; used: number; total: number; percentage: number };
    environment: { status: string; nodeEnv: string };
  };
}

// Temps de démarrage du serveur
const startTime = Date.now();

export async function GET(request: NextRequest) {
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks: {
      database: { status: 'unknown' },
      memory: { status: 'unknown', used: 0, total: 0, percentage: 0 },
      environment: { status: 'unknown', nodeEnv: process.env.NODE_ENV || 'development' },
    },
  };

  // Vérification de la base de données
  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;
    
    health.checks.database = {
      status: 'healthy',
      latency: dbLatency,
    };
  } catch (error) {
    health.checks.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    health.status = 'unhealthy';
  }

  // Vérification de la mémoire
  try {
    const memUsage = process.memoryUsage();
    const usedMemory = memUsage.heapUsed;
    const totalMemory = memUsage.heapTotal;
    const memoryPercentage = (usedMemory / totalMemory) * 100;

    health.checks.memory = {
      status: memoryPercentage > 90 ? 'unhealthy' : memoryPercentage > 75 ? 'degraded' : 'healthy',
      used: Math.round(usedMemory / 1024 / 1024), // MB
      total: Math.round(totalMemory / 1024 / 1024), // MB
      percentage: Math.round(memoryPercentage * 100) / 100,
    };

    if (health.checks.memory.status === 'unhealthy') {
      health.status = 'unhealthy';
    } else if (health.checks.memory.status === 'degraded' && health.status === 'healthy') {
      health.status = 'degraded';
    }
  } catch (error) {
    health.checks.memory = {
      status: 'unknown',
      used: 0,
      total: 0,
      percentage: 0,
    };
  }

  // Vérification de l'environnement
  try {
    const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET'];
    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    
    health.checks.environment = {
      status: missingVars.length === 0 ? 'healthy' : 'unhealthy',
      nodeEnv: process.env.NODE_ENV || 'development',
    };

    if (missingVars.length > 0) {
      health.status = 'unhealthy';
    }
  } catch (error) {
    health.checks.environment = {
      status: 'unknown',
      nodeEnv: process.env.NODE_ENV || 'development',
    };
  }

  // Retourner le statut HTTP approprié
  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}

// HEAD - Simple health check sans corps de réponse
export async function HEAD() {
  try {
    // Vérification rapide de la base de données
    await db.$queryRaw`SELECT 1`;
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
