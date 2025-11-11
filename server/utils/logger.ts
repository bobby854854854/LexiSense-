
import winston from 'winston'
import path from 'path'

/**
 * Structured Logging Service
 * 
 * Time Complexity: O(1) per log entry
 * Space Complexity: O(n) where n is number of log entries (with rotation)
 * 
 * Features:
 * - Structured JSON logging for production
 * - Pretty formatting for development
 * - Log rotation to prevent disk space issues
 * - Multiple transport support (file, console, external services)
 * - Performance metrics tracking
 */

const { NODE_ENV, LOG_LEVEL = 'info' } = process.env

// Custom format for better readability in development
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata, null, 2)}`
    }
    return msg
  })
)

// Production format - structured JSON
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

// Create logger instance
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: NODE_ENV === 'production' ? prodFormat : devFormat,
  defaultMeta: {
    service: 'lexisense-api',
    environment: NODE_ENV,
  },
  transports: [
    // Console output
    new winston.transports.Console({
      silent: process.env.SILENT_LOGS === 'true',
    }),
  ],
})

// Add file transports in production
if (NODE_ENV === 'production') {
  const logDir = process.env.LOG_DIR || './logs'
  
  // Error log
  logger.add(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  )
  
  // Combined log
  logger.add(
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    })
  )
}

/**
 * Audit Logger for security-sensitive operations
 * Time Complexity: O(1)
 */
export const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'lexisense-audit',
    environment: NODE_ENV,
  },
  transports: [
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || './logs', 'audit.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 30, // Keep 30 days of audit logs
    }),
  ],
})

/**
 * Performance metrics tracker
 * Time Complexity: O(1) per metric
 * Space Complexity: O(m) where m is unique metrics
 */
class PerformanceMetrics {
  private metrics: Map<string, number[]> = new Map()
  private readonly MAX_SAMPLES = 1000

  /**
   * Record a metric value
   * Time Complexity: O(1) amortized
   */
  record(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    
    const values = this.metrics.get(name)!
    values.push(value)
    
    // Keep only recent samples to prevent memory growth
    if (values.length > this.MAX_SAMPLES) {
      values.shift()
    }
  }

  /**
   * Get statistics for a metric
   * Time Complexity: O(n) where n is sample count
   */
  getStats(name: string): {
    count: number
    avg: number
    min: number
    max: number
    p50: number
    p95: number
    p99: number
  } | null {
    const values = this.metrics.get(name)
    if (!values || values.length === 0) return null

    const sorted = [...values].sort((a, b) => a - b)
    const count = sorted.length

    return {
      count,
      avg: sorted.reduce((a, b) => a + b, 0) / count,
      min: sorted[0],
      max: sorted[count - 1],
      p50: sorted[Math.floor(count * 0.5)],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
    }
  }

  /**
   * Get all metrics
   * Time Complexity: O(m * n) where m is metrics, n is samples per metric
   */
  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {}
    for (const name of this.metrics.keys()) {
      stats[name] = this.getStats(name)
    }
    return stats
  }

  /**
   * Clear all metrics
   * Time Complexity: O(1)
   */
  clear(): void {
    this.metrics.clear()
  }
}

export const metrics = new PerformanceMetrics()

/**
 * Middleware for request logging with performance tracking
 * Time Complexity: O(1) per request
 */
export function requestLogger(req: any, res: any, next: any) {
  const startTime = Date.now()
  
  // Log request
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
  })

  // Track response
  res.on('finish', () => {
    const duration = Date.now() - startTime
    
    // Record metrics
    metrics.record('request_duration', duration)
    metrics.record(`${req.method}_${res.statusCode}`, duration)
    
    // Log response
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
    logger.log(logLevel, 'Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
    })
  })

  next()
}

/**
 * Error logging middleware
 * Time Complexity: O(1)
 */
export function errorLogger(err: any, req: any, res: any, next: any) {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    userId: req.user?.id,
    body: req.body,
  })

  next(err)
}

/**
 * Audit logging helper for security events
 * Time Complexity: O(1)
 */
export function logAuditEvent(data: {
  event: string
  userId?: string
  organizationId?: string
  resourceType?: string
  resourceId?: string
  action: string
  result: 'success' | 'failure'
  metadata?: any
  ipAddress?: string
}): void {
  auditLogger.info('Audit event', {
    timestamp: new Date().toISOString(),
    ...data,
  })
}

/**
 * Performance monitoring wrapper
 * Time Complexity: O(1) + complexity of wrapped function
 * 
 * Usage:
 * const result = await measurePerformance('operation_name', async () => {
 *   // expensive operation
 * })
 */
export async function measurePerformance<T>(
  operationName: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  try {
    const result = await fn()
    const duration = Date.now() - startTime
    
    metrics.record(operationName, duration)
    
    if (duration > 1000) {
      logger.warn('Slow operation detected', {
        operation: operationName,
        duration: `${duration}ms`,
      })
    }
    
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Operation failed', {
      operation: operationName,
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * Health check endpoint data
 * Time Complexity: O(1)
 */
export function getHealthMetrics(): {
  uptime: number
  memory: NodeJS.MemoryUsage
  performance: Record<string, any>
} {
  return {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    performance: metrics.getAllStats(),
  }
}

// File: server/middleware/errorHandler.ts
import type { Request, Response, NextFunction } from 'express'
import { logger, logAuditEvent } from '../utils/logger'

/**
 * Centralized error handling middleware
 * 
 * Security: Prevents information disclosure by sanitizing error messages
 * Time Complexity: O(1)
 */

interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err.statusCode || 500
  const isOperational = err.isOperational || false

  // Log error
  logger.error('Application error', {
    error: err.message,
    stack: err.stack,
    statusCode,
    method: req.method,
    url: req.url,
    userId: (req as any).user?.id,
    isOperational,
  })

  // Log security-relevant errors to audit log
  if (statusCode === 401 || statusCode === 403) {
    logAuditEvent({
      event: 'authorization_failure',
      userId: (req as any).user?.id,
      action: `${req.method} ${req.url}`,
      result: 'failure',
      ipAddress: req.ip,
      metadata: { statusCode, error: err.message },
    })
  }

  // Send appropriate response
  if (process.env.NODE_ENV === 'production') {
    // Production: Don't leak internal details
    res.status(statusCode).json({
      message: isOperational ? err.message : 'An unexpected error occurred',
      ...(isOperational && { error: err.message }),
    })
  } else {
    // Development: Include full error details
    res.status(statusCode).json({
      message: err.message,
      error: err,
      stack: err.stack,
    })
  }
}

/**
 * Not found handler
 * Time Complexity: O(1)
 */
export function notFoundHandler(req: Request, res: Response) {
  logger.warn('Route not found', {
    method: req.method,
    url: req.url,
    userId: (req as any).user?.id,
  })

  res.status(404).json({
    message: 'Route not found',
  })
}

/**
 * Async error wrapper
 * Eliminates need for try-catch in route handlers
 * 
 * Time Complexity: O(1) + complexity of wrapped function
 * 
 * Usage:
 * router.get('/path', asyncHandler(async (req, res) => {
 *   // async code that might throw
 * }))
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Custom error classes
 */

export class BadRequestError extends Error {
  statusCode = 400
  isOperational = true

  constructor(message: string) {
    super(message)
    this.name = 'BadRequestError'
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401
  isOperational = true

  constructor(message: string = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  statusCode = 403
  isOperational = true

  constructor(message: string = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends Error {
  statusCode = 404
  isOperational = true

  constructor(message: string = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  statusCode = 409
  isOperational = true

  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

export class TooManyRequestsError extends Error {
  statusCode = 429
  isOperational = true

  constructor(message: string = 'Too many requests') {
    super(message)
    this.name = 'TooManyRequestsError'
  }
}