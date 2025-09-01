/**
 * Standardized Logging System for ServesPlatform
 * 
 * This file contains a comprehensive logging system with proper categorization,
 * structured logging, and performance monitoring. It provides consistent logging
 * across the entire application with proper error handling and debugging support.
 * 
 * Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3
 * @fileoverview Comprehensive logging system for ServesPlatform
 * @author ServesPlatform Development Team
 * @version 2.1.0
 */

import { ErrorType, ErrorSeverity, AppError } from './error-types';

// =============================================================================
// LOGGING TYPES AND INTERFACES
// =============================================================================

/**
 * Log levels with hierarchical importance
 * Higher levels include all lower levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

/**
 * Log categories for better organization and filtering
 */
export enum LogCategory {
  API = 'API',
  AUTH = 'AUTH',
  DATABASE = 'DATABASE',
  CACHE = 'CACHE',
  VALIDATION = 'VALIDATION',
  PERFORMANCE = 'PERFORMANCE',
  SECURITY = 'SECURITY',
  USER_ACTION = 'USER_ACTION',
  SYSTEM = 'SYSTEM',
  ERROR = 'ERROR'
}

/**
 * Structured log entry interface
 * Provides consistent structure for all log entries
 */
export interface LogEntry {
  /** Unique identifier for the log entry */
  id: string;
  /** Log level */
  level: LogLevel;
  /** Log category */
  category: LogCategory;
  /** Log message */
  message: string;
  /** Additional context data */
  context?: Record<string, any>;
  /** Error object if applicable */
  error?: AppError | Error;
  /** Timestamp when the log was created */
  timestamp: string;
  /** Request ID for tracing */
  requestId?: string;
  /** User ID if available */
  userId?: string;
  /** Session ID if available */
  sessionId?: string;
  /** Source location (file:line) */
  source?: string;
  /** Execution duration in milliseconds */
  duration?: number;
}

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level: LogLevel;
  /** Whether to enable console output */
  enableConsole: boolean;
  /** Whether to enable structured logging */
  enableStructured: boolean;
  /** Maximum number of log entries to keep in memory */
  maxEntries: number;
  /** Categories to include (empty array means all) */
  includeCategories: LogCategory[];
  /** Categories to exclude */
  excludeCategories: LogCategory[];
  /** Whether to include stack traces for errors */
  includeStackTrace: boolean;
  /** Whether to enable performance logging */
  enablePerformanceLogging: boolean;
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  /** Operation name */
  operation: string;
  /** Start time */
  startTime: number;
  /** End time */
  endTime: number;
  /** Duration in milliseconds */
  duration: number;
  /** Additional metrics */
  metrics?: Record<string, number>;
  /** Context data */
  context?: Record<string, any>;
}

// =============================================================================
// LOGGER CLASS
// =============================================================================

/**
 * Comprehensive logging system with structured logging and performance monitoring
 * 
 * @example
 * ```typescript
 * const logger = new Logger({ level: LogLevel.INFO });
 * 
 * logger.info('User logged in', { userId: '123' }, LogCategory.AUTH);
 * logger.error('Database connection failed', error, { database: 'main' }, LogCategory.DATABASE);
 * logger.api('GET', '/api/users', 200, 150, { count: 10 });
 * 
 * const timer = logger.startTimer('database-query');
 * // ... perform operation
 * timer.end({ query: 'SELECT * FROM users' });
 * ```
 */
export class Logger {
  private config: LoggerConfig;
  private entries: LogEntry[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableStructured: true,
      maxEntries: 1000,
      includeCategories: [],
      excludeCategories: [],
      includeStackTrace: true,
      enablePerformanceLogging: true,
      ...config
    };
  }

  /**
   * Log a debug message
   */
  debug(
    message: string,
    context?: Record<string, any>,
    category: LogCategory = LogCategory.SYSTEM,
    requestId?: string
  ): void {
    this.log(LogLevel.DEBUG, message, context, undefined, category, requestId);
  }

  /**
   * Log an info message
   */
  info(
    message: string,
    context?: Record<string, any>,
    category: LogCategory = LogCategory.SYSTEM,
    requestId?: string
  ): void {
    this.log(LogLevel.INFO, message, context, undefined, category, requestId);
  }

  /**
   * Log a warning message
   */
  warn(
    message: string,
    error?: AppError | Error,
    context?: Record<string, any>,
    category: LogCategory = LogCategory.SYSTEM,
    requestId?: string
  ): void {
    this.log(LogLevel.WARN, message, context, error, category, requestId);
  }

  /**
   * Log an error message
   */
  error(
    message: string,
    error?: AppError | Error,
    context?: Record<string, any>,
    category: LogCategory = LogCategory.ERROR,
    requestId?: string
  ): void {
    this.log(LogLevel.ERROR, message, context, error, category, requestId);
  }

  /**
   * Log a critical error message
   */
  critical(
    message: string,
    error?: AppError | Error,
    context?: Record<string, any>,
    category: LogCategory = LogCategory.ERROR,
    requestId?: string
  ): void {
    this.log(LogLevel.CRITICAL, message, context, error, category, requestId);
  }

  /**
   * Log API request/response
   */
  api(
    method: string,
    url: string,
    status: number,
    duration: number,
    context?: Record<string, any>,
    requestId?: string
  ): void {
    const level = status >= 500 ? LogLevel.ERROR : status >= 400 ? LogLevel.WARN : LogLevel.INFO;
    const message = `${method} ${url} ${status}`;
    
    this.log(level, message, {
      method,
      url,
      status,
      duration,
      ...context
    }, undefined, LogCategory.API, requestId);
  }

  /**
   * Log authentication events
   */
  auth(
    event: string,
    userId?: string,
    context?: Record<string, any>,
    requestId?: string
  ): void {
    this.log(LogLevel.INFO, `Auth: ${event}`, {
      userId,
      ...context
    }, undefined, LogCategory.AUTH, requestId);
  }

  /**
   * Log database operations
   */
  database(
    operation: string,
    table: string,
    duration?: number,
    context?: Record<string, any>,
    requestId?: string
  ): void {
    this.log(LogLevel.DEBUG, `DB: ${operation} on ${table}`, {
      operation,
      table,
      duration,
      ...context
    }, undefined, LogCategory.DATABASE, requestId);
  }

  /**
   * Log cache operations
   */
  cache(
    operation: 'hit' | 'miss' | 'set' | 'delete',
    key: string,
    context?: Record<string, any>,
    requestId?: string
  ): void {
    this.log(LogLevel.DEBUG, `Cache ${operation}: ${key}`, {
      operation,
      key,
      ...context
    }, undefined, LogCategory.CACHE, requestId);
  }

  /**
   * Log user actions
   */
  userAction(
    action: string,
    userId: string,
    context?: Record<string, any>,
    requestId?: string
  ): void {
    this.log(LogLevel.INFO, `User action: ${action}`, {
      userId,
      action,
      ...context
    }, undefined, LogCategory.USER_ACTION, requestId);
  }

  /**
   * Log performance metrics
   */
  performance(
    operation: string,
    duration: number,
    context?: Record<string, any>,
    requestId?: string
  ): void {
    if (!this.config.enablePerformanceLogging) return;

    this.log(LogLevel.INFO, `Performance: ${operation} took ${duration}ms`, {
      operation,
      duration,
      ...context
    }, undefined, LogCategory.PERFORMANCE, requestId);

    // Store performance metrics
    this.performanceMetrics.push({
      operation,
      startTime: Date.now() - duration,
      endTime: Date.now(),
      duration,
      context
    });

    // Keep only recent metrics
    if (this.performanceMetrics.length > this.config.maxEntries) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.config.maxEntries);
    }
  }

  /**
   * Start a performance timer
   */
  startTimer(operation: string, context?: Record<string, any>): PerformanceTimer {
    return new PerformanceTimer(operation, this, context);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: AppError | Error,
    category: LogCategory = LogCategory.SYSTEM,
    requestId?: string
  ): void {
    // Check if we should log this level
    if (level < this.config.level) return;

    // Check category filters
    if (this.config.includeCategories.length > 0 && !this.config.includeCategories.includes(category)) {
      return;
    }
    if (this.config.excludeCategories.includes(category)) {
      return;
    }

    const entry: LogEntry = {
      id: this.generateLogId(),
      level,
      category,
      message,
      context,
      error,
      timestamp: new Date().toISOString(),
      requestId,
      source: this.getSource()
    };

    // Add to memory store
    this.entries.push(entry);
    if (this.entries.length > this.config.maxEntries) {
      this.entries = this.entries.slice(-this.config.maxEntries);
    }

    // Console output
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] [${levelName}] [${entry.category}]`;
    
    let message = `${prefix} ${entry.message}`;
    
    if (entry.requestId) {
      message += ` (${entry.requestId})`;
    }

    const contextData = {
      ...(entry.context || {}),
      ...(entry.error && this.config.includeStackTrace ? { error: entry.error } : {})
    };

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, contextData);
        break;
      case LogLevel.INFO:
        console.info(message, contextData);
        break;
      case LogLevel.WARN:
        console.warn(message, contextData);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(message, contextData);
        break;
    }
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `log_${timestamp}_${random}`;
  }

  /**
   * Get source location (simplified for browser environment)
   */
  private getSource(): string {
    if (typeof window === 'undefined') return 'server';
    
    try {
      const stack = new Error().stack;
      if (stack) {
        const lines = stack.split('\n');
        // Find the first line that's not from this logger
        for (let i = 3; i < lines.length; i++) {
          const line = lines[i];
          if (line && !line.includes('logger-types.ts') && !line.includes('Logger')) {
            const match = line.match(/at\s+(.+):(\d+):(\d+)/);
            if (match) {
              const [, file, lineNum] = match;
              const fileName = file.split('/').pop() || file;
              return `${fileName}:${lineNum}`;
            }
          }
        }
      }
    } catch (e) {
      // Ignore errors in source detection
    }
    
    return 'unknown';
  }

  /**
   * Get recent log entries
   */
  getRecentLogs(count: number = 100, level?: LogLevel, category?: LogCategory): LogEntry[] {
    let filtered = this.entries;

    if (level !== undefined) {
      filtered = filtered.filter(entry => entry.level >= level);
    }

    if (category !== undefined) {
      filtered = filtered.filter(entry => entry.category === category);
    }

    return filtered.slice(-count);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(operation?: string): PerformanceMetrics[] {
    if (operation) {
      return this.performanceMetrics.filter(metric => metric.operation === operation);
    }
    return [...this.performanceMetrics];
  }

  /**
   * Clear all logs and metrics
   */
  clear(): void {
    this.entries = [];
    this.performanceMetrics = [];
  }

  /**
   * Update logger configuration
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// =============================================================================
// PERFORMANCE TIMER
// =============================================================================

/**
 * Performance timer for measuring operation duration
 */
export class PerformanceTimer {
  private startTime: number;
  private operation: string;
  private logger: Logger;
  private context?: Record<string, any>;

  constructor(operation: string, logger: Logger, context?: Record<string, any>) {
    this.operation = operation;
    this.logger = logger;
    this.context = context;
    this.startTime = performance.now();
  }

  /**
   * End the timer and log the performance
   */
  end(additionalContext?: Record<string, any>): number {
    const endTime = performance.now();
    const duration = Math.round(endTime - this.startTime);

    this.logger.performance(this.operation, duration, {
      ...this.context,
      ...additionalContext
    });

    return duration;
  }
}

// =============================================================================
// SINGLETON LOGGER INSTANCE
// =============================================================================

/**
 * Default logger configuration for the application
 */
const defaultConfig: LoggerConfig = {
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  enableConsole: true,
  enableStructured: true,
  maxEntries: 1000,
  includeCategories: [],
  excludeCategories: [],
  includeStackTrace: process.env.NODE_ENV === 'development',
  enablePerformanceLogging: true
};

/**
 * Global logger instance
 * Use this throughout the application for consistent logging
 * 
 * @example
 * ```typescript
 * import { logger } from '@/lib/logger-types';
 * 
 * logger.info('Application started');
 * logger.error('Database connection failed', error);
 * logger.api('GET', '/api/users', 200, 150);
 * ```
 */
export const logger = new Logger(defaultConfig);

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a logger with custom configuration
 */
export function createLogger(config: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}

/**
 * Log level utility functions
 */
export const LogLevelUtils = {
  /**
   * Convert log level to string
   */
  toString(level: LogLevel): string {
    return LogLevel[level];
  },

  /**
   * Convert string to log level
   */
  fromString(level: string): LogLevel {
    const upperLevel = level.toUpperCase();
    return LogLevel[upperLevel as keyof typeof LogLevel] ?? LogLevel.INFO;
  },

  /**
   * Check if level should be logged
   */
  shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
    return level >= minLevel;
  }
};