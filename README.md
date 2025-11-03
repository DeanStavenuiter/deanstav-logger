# deanstav-logger

A lightweight, TypeScript-first logging utility for sending logs to a monitoring service. Designed for **server-side logging** with Next.js, Node.js, and other backend applications. Perfect for centralized logging with minimal setup while keeping your API keys secure.

## Features

- 🚀 **TypeScript First**: Full TypeScript support with comprehensive types
- 📦 **Dual Package**: Works with both CommonJS and ES Modules
- 🎯 **Simple API**: Clean, intuitive interface
- 🔧 **Configurable**: Control logging behavior per environment
- 🔒 **Server-Side First**: Designed for secure server-side logging
- ⚡ **Zero Dependencies**: No runtime dependencies

## ⚠️ Important: Server-Side Usage Recommended

This logger is **designed for server-side use** to keep your API keys secure. Your `apiKey` should **never** be exposed to the client.

**For Next.js applications**: Use this logger in Server Components, API Routes, and Server Actions. For client-side logging, proxy logs through an API route (see examples below).

## Installation

```bash
npm install deanstav-logger
```

or

```bash
yarn add deanstav-logger
```

## Usage

### Basic Setup (Server-Side)

```typescript
// lib/logger.ts - Server-side only!
import { createLogger } from 'deanstav-logger';

// Use this logger ONLY in server-side code:
// - Server Components
// - API Routes
// - Server Actions
// - Node.js backend
export const logger = createLogger({
  apiEndpoint: process.env.LOG_ENDPOINT!, // Use server-side env vars
  apiKey: process.env.LOG_API_KEY!,       // Keep this secret!
  domain: 'my-app'
});

// Log messages (server-side only)
await logger.info('User logged in', 'auth', { userId: '123' });
await logger.warn('High memory usage', 'performance', { memory: '85%' });
await logger.error('Database connection failed', 'database', { error: 'timeout' });
```

### Configuration Options

```typescript
interface LoggerConfig {
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
```

### Advanced Usage

#### Custom Error Handling

```typescript
const logger = createLogger({
  apiEndpoint: 'https://your-api.com/logs',
  apiKey: process.env.LOG_API_KEY!,
  domain: 'my-app',
  onError: (error) => {
    // Custom error handling
    console.error('Logging failed:', error);
    // Send to alternative service, etc.
  }
});
```

#### Environment-Specific Logging

```typescript
const logger = createLogger({
  apiEndpoint: 'https://your-api.com/logs',
  apiKey: process.env.LOG_API_KEY!,
  domain: 'my-app',
  enableInDevelopment: false, // Disable in development
  enableInProduction: true    // Only log in production
});
```

#### Using the Logger Class Directly

```typescript
import { Logger } from 'deanstav-logger';

const logger = new Logger({
  apiEndpoint: 'https://your-api.com/logs',
  apiKey: process.env.LOG_API_KEY!,
  domain: 'my-app'
});

await logger.log('info', 'Custom message', 'custom-type', { custom: 'data' });
```

## API Reference

### `createLogger(config: LoggerConfig): Logger`

Factory function to create a new logger instance.

### `Logger`

#### Methods

- `log(level: LogLevel, message: string, type: string, data?: any): Promise<void>`
  - Generic logging method
  
- `info(message: string, type: string, data?: any): Promise<void>`
  - Log an info-level message
  
- `warn(message: string, type: string, data?: any): Promise<void>`
  - Log a warning-level message
  
- `error(message: string, type: string, data?: any): Promise<void>`
  - Log an error-level message

### Types

```typescript
type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  type: string;
  data: any;
  userAgent: string;
  nodeEnv: string;
  domain: string;
}
```

## Example: Next.js Application (Recommended)

### Server-Side Logging (Server Components, API Routes, Server Actions)

```typescript
// lib/logger.ts
import { createLogger } from 'deanstav-logger';

export const logger = createLogger({
  apiEndpoint: process.env.LOG_ENDPOINT!, // Server-side env var
  apiKey: process.env.LOG_API_KEY!,       // Secret - never exposed to client
  domain: 'my-nextjs-app',
  enableInDevelopment: false
});
```

```typescript
// app/api/users/route.ts
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

export async function GET() {
  await logger.info('Fetching users', 'api', { endpoint: '/api/users' });
  
  try {
    const users = await db.users.findMany();
    return NextResponse.json(users);
  } catch (error) {
    await logger.error('Failed to fetch users', 'database', { error });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

```typescript
// app/page.tsx (Server Component)
import { logger } from '@/lib/logger';

export default async function HomePage() {
  await logger.info('Home page rendered', 'page-view');
  
  const data = await fetchData();
  return <div>{data}</div>;
}
```

### Client-Side Logging (Secure Pattern with API Route Proxy)

```typescript
// app/api/log/route.ts
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { level, message, type, data } = await request.json();
    
    // Validate input
    if (!['info', 'warn', 'error'].includes(level)) {
      return NextResponse.json({ error: 'Invalid log level' }, { status: 400 });
    }
    
    // Log using server-side logger (keeps API key secure)
    await logger.log(level, message, type, data);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 });
  }
}
```

```typescript
// lib/logger.client.ts
'use client';

import { LogLevel } from 'deanstav-logger';

/**
 * Client-side logger that proxies through API route
 * This keeps your API key secure on the server
 */
export const clientLogger = {
  async log(level: LogLevel, message: string, type: string, data?: any) {
    try {
      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, message, type, data })
      });
    } catch (error) {
      // Silently fail or handle error
      console.error('Failed to send log:', error);
    }
  },
  
  async info(message: string, type: string, data?: any) {
    return this.log('info', message, type, data);
  },
  
  async warn(message: string, type: string, data?: any) {
    return this.log('warn', message, type, data);
  },
  
  async error(message: string, type: string, data?: any) {
    return this.log('error', message, type, data);
  }
};
```

```typescript
// app/components/ErrorBoundary.tsx
'use client';

import { clientLogger } from '@/lib/logger.client';
import { useEffect } from 'react';

export function ErrorBoundary({ error }: { error: Error }) {
  useEffect(() => {
    // Safe: proxies through API route, no API key exposed
    clientLogger.error('Client error', 'error-boundary', {
      message: error.message,
      stack: error.stack
    });
  }, [error]);

  return <div>Something went wrong!</div>;
}
```

## Security Best Practices

### ✅ DO

- **Use server-side only**: Keep your logger in Server Components, API Routes, and Server Actions
- **Proxy client logs**: Use API routes to proxy client-side logs (as shown above)
- **Use environment variables**: Store `apiKey` in server-side env vars (without `NEXT_PUBLIC_` prefix)
- **Validate input**: Always validate log data in your API route before forwarding

### ❌ DON'T

- **Never expose API keys**: Don't use `NEXT_PUBLIC_` or `REACT_APP_` prefixes for your API key
- **Don't log directly from client**: Avoid importing the main logger in client components
- **Don't trust client data**: Always sanitize/validate log data from client requests

## Example: Node.js Application

```typescript
// logger.ts
import { createLogger } from 'deanstav-logger';

export const logger = createLogger({
  apiEndpoint: process.env.LOG_ENDPOINT!,
  apiKey: process.env.LOG_API_KEY!,
  domain: 'my-node-app'
});

// server.ts
import express from 'express';
import { logger } from './logger';

const app = express();

app.use(async (req, res, next) => {
  await logger.info('Request received', 'http', {
    method: req.method,
    path: req.path
  });
  next();
});

app.use(async (err, req, res, next) => {
  await logger.error('Server error', 'http', {
    error: err.message,
    path: req.path
  });
  res.status(500).send('Internal Server Error');
});
```

## Development

### Building

```bash
npm run build
```

This will compile TypeScript to both CommonJS and ES Module formats in the `dist` folder.

### Publishing

```bash
npm publish
```

The `prepublishOnly` script will automatically build the package before publishing.

## License

MIT

## Author

Dean Stavenuiter

