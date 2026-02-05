import fs from 'fs';
import path from 'path';

const LOGS_DIR = path.join(process.cwd(), 'logs');
const RETENTION_DAYS = 7;

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  details?: Record<string, any>;
}

function ensureLogsDir(): void {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

function getLogFilename(date: Date = new Date()): string {
  const dateStr = date.toISOString().split('T')[0];
  return path.join(LOGS_DIR, `scraper-${dateStr}.log`);
}

function formatLogEntry(entry: LogEntry): string {
  const { timestamp, level, category, message, details } = entry;
  let line = `[${timestamp}] [${level}] [${category}] ${message}`;
  if (details && Object.keys(details).length > 0) {
    line += ` | ${JSON.stringify(details)}`;
  }
  return line;
}

export function log(level: LogLevel, category: string, message: string, details?: Record<string, any>): void {
  ensureLogsDir();
  
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    details,
  };
  
  const line = formatLogEntry(entry);
  const filename = getLogFilename();
  
  fs.appendFileSync(filename, line + '\n');
  
  const consolePrefix = {
    INFO: '\x1b[34mINFO\x1b[0m',
    WARN: '\x1b[33mWARN\x1b[0m',
    ERROR: '\x1b[31mERROR\x1b[0m',
    SUCCESS: '\x1b[32mSUCCESS\x1b[0m',
  };
  console.log(`[${consolePrefix[level]}] [${category}] ${message}`);
}

export function logInfo(category: string, message: string, details?: Record<string, any>): void {
  log('INFO', category, message, details);
}

export function logWarn(category: string, message: string, details?: Record<string, any>): void {
  log('WARN', category, message, details);
}

export function logError(category: string, message: string, details?: Record<string, any>): void {
  log('ERROR', category, message, details);
}

export function logSuccess(category: string, message: string, details?: Record<string, any>): void {
  log('SUCCESS', category, message, details);
}

export function cleanupOldLogs(): number {
  ensureLogsDir();
  
  const now = Date.now();
  const maxAge = RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let deletedCount = 0;
  
  try {
    const files = fs.readdirSync(LOGS_DIR);
    for (const file of files) {
      if (!file.endsWith('.log')) continue;
      
      const filePath = path.join(LOGS_DIR, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;
      
      if (age > maxAge) {
        fs.unlinkSync(filePath);
        deletedCount++;
        logInfo('CLEANUP', `Deleted old log file: ${file}`);
      }
    }
  } catch (error: any) {
    logError('CLEANUP', `Error cleaning up logs: ${error.message}`);
  }
  
  return deletedCount;
}

export function getLogFiles(): { filename: string; date: string; size: number }[] {
  ensureLogsDir();
  
  try {
    const files = fs.readdirSync(LOGS_DIR)
      .filter(f => f.endsWith('.log'))
      .map(filename => {
        const filePath = path.join(LOGS_DIR, filename);
        const stats = fs.statSync(filePath);
        const dateMatch = filename.match(/scraper-(\d{4}-\d{2}-\d{2})\.log/);
        return {
          filename,
          date: dateMatch ? dateMatch[1] : 'unknown',
          size: stats.size,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
    
    return files;
  } catch (error) {
    return [];
  }
}

export function readLogFile(filename: string): string | null {
  const filePath = path.join(LOGS_DIR, filename);
  
  if (!filePath.startsWith(LOGS_DIR)) {
    return null;
  }
  
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    return null;
  }
}

export function getRecentLogs(lines: number = 50): LogEntry[] {
  ensureLogsDir();
  
  const logFiles = getLogFiles();
  if (logFiles.length === 0) return [];
  
  const entries: LogEntry[] = [];
  
  for (const file of logFiles) {
    const content = readLogFile(file.filename);
    if (!content) continue;
    
    const fileLines = content.trim().split('\n');
    for (const line of fileLines) {
      const match = line.match(/^\[([^\]]+)\] \[([^\]]+)\] \[([^\]]+)\] (.+)$/);
      if (match) {
        const [, timestamp, level, category, rest] = match;
        const detailsMatch = rest.match(/^(.+?) \| (.+)$/);
        
        let details: Record<string, any> | undefined;
        if (detailsMatch) {
          try {
            details = JSON.parse(detailsMatch[2]);
          } catch {
            details = undefined;
          }
        }
        
        entries.push({
          timestamp,
          level: level as LogLevel,
          category,
          message: detailsMatch ? detailsMatch[1] : rest,
          details,
        });
      }
    }
    
    if (entries.length >= lines) break;
  }
  
  return entries.slice(0, lines);
}

export function runStartupCleanup(): void {
  const deleted = cleanupOldLogs();
  if (deleted > 0) {
    console.log(`Cleaned up ${deleted} old log files on startup`);
  }
}
