// Type declaration for global process (for environments that have it)
declare const process: { env: { NODE_ENV?: string } } | undefined;

/**
 * Log level types
 */
export type LogLevel = "info" | "warn" | "error";

/**
 * Configuration options for the logger
 */
export interface LoggerConfig {
  /** The API endpoint to send logs to */
  apiEndpoint: string;
  /** The API key for authentication */
  apiKey: string;
  /** The domain/app name for log identification */
  domain: string;
  /** Whether to send logs in development mode (default: true) */
  enableInDevelopment?: boolean;
  /** Whether to send logs in production mode (default: true) */
  enableInProduction?: boolean;
  /** Custom error handler when logging fails */
  onError?: (error: unknown) => void;
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  type: string;
  data: any;
  userAgent: string;
  nodeEnv: string;
  domain: string;
}

/**
 * Logger class for sending logs to a monitoring service
 */
export class Logger {
  private config: Required<LoggerConfig>;

  constructor(config: LoggerConfig) {
    this.config = {
      enableInDevelopment: true,
      enableInProduction: true,
      onError: (error) => {
        console.error("[deanstav-logger] Failed to send log:", error);
      },
      ...config,
    };
  }

  /**
   * Log a message to the monitoring service
   */
  async log(
    level: LogLevel,
    message: string,
    type: string,
    data?: any
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      timestamp,
      level,
      message,
      type,
      data: data || {},
      userAgent: this.getUserAgent(),
      nodeEnv: this.getNodeEnv(),
      domain: this.config.domain,
    };

    // Check if logging is enabled for current environment
    if (!this.shouldLog()) {
      return;
    }

    try {
      const response = await fetch(this.config.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
        },
        body: JSON.stringify(logEntry),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      this.config.onError(error);
    }
  }

  /**
   * Log an info message
   */
  async info(message: string, type: string, data?: any): Promise<void> {
    return this.log("info", message, type, data);
  }

  /**
   * Log a warning message
   */
  async warn(message: string, type: string, data?: any): Promise<void> {
    return this.log("warn", message, type, data);
  }

  /**
   * Log an error message
   */
  async error(message: string, type: string, data?: any): Promise<void> {
    return this.log("error", message, type, data);
  }

  private getUserAgent(): string {
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      return navigator.userAgent;
    }
    return "server";
  }

  private getNodeEnv(): string {
    if (typeof process !== "undefined" && process.env) {
      return process.env.NODE_ENV || "development";
    }
    return "development";
  }

  private shouldLog(): boolean {
    const env = this.getNodeEnv();
    if (env === "production") {
      return this.config.enableInProduction;
    }
    if (env === "development") {
      return this.config.enableInDevelopment;
    }
    return true;
  }
}

/**
 * Create a logger instance
 */
export function createLogger(config: LoggerConfig): Logger {
  return new Logger(config);
}

// Export a default instance factory
export default createLogger;