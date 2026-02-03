import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
)

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`
    }
    return msg
  })
)

// Create logs directory
const logsDir = path.join(__dirname, '../logs')

// Transport configurations
const transports: winston.transport[] = []

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug',
    })
  )
} else {
  transports.push(
    new winston.transports.Console({
      format: logFormat,
      level: 'info',
    })
  )
}

// File transports for all environments
transports.push(
  // Error logs
  new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: logFormat,
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true,
  }),
  // Combined logs
  new DailyRotateFile({
    filename: path.join(logsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    format: logFormat,
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true,
  }),
  // Audit trail logs
  new DailyRotateFile({
    filename: path.join(logsDir, 'audit-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'info',
    format: logFormat,
    maxSize: '20m',
    maxFiles: '90d', // Keep audit logs longer
    zippedArchive: true,
  })
)

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false,
})

// Audit logger for security-sensitive operations
export const auditLogger = {
  log: (action: string, userId: string | undefined, details: Record<string, any>) => {
    logger.info('AUDIT', {
      action,
      userId,
      timestamp: new Date().toISOString(),
      ...details,
    })
  },
  
  login: (userId: string, success: boolean, ip?: string) => {
    auditLogger.log('USER_LOGIN', userId, { success, ip })
  },
  
  logout: (userId: string, ip?: string) => {
    auditLogger.log('USER_LOGOUT', userId, { ip })
  },
  
  contractUpload: (userId: string, contractId: string, filename: string) => {
    auditLogger.log('CONTRACT_UPLOAD', userId, { contractId, filename })
  },
  
  contractView: (userId: string, contractId: string) => {
    auditLogger.log('CONTRACT_VIEW', userId, { contractId })
  },
  
  contractDelete: (userId: string, contractId: string) => {
    auditLogger.log('CONTRACT_DELETE', userId, { contractId })
  },
  
  unauthorized: (ip: string, path: string) => {
    auditLogger.log('UNAUTHORIZED_ACCESS', undefined, { ip, path })
  },
}

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(
  new winston.transports.File({ 
    filename: path.join(logsDir, 'exceptions.log'),
    format: logFormat,
  })
)

logger.rejections.handle(
  new winston.transports.File({ 
    filename: path.join(logsDir, 'rejections.log'),
    format: logFormat,
  })
)

export default logger
