import { Router } from 'express';
import { logger } from '../utils/logger';

const router = Router();

interface FrontendLogEntry {
  timestamp: string;
  level: number;
  message: string;
  context?: {
    component?: string;
    userId?: string;
    sessionId?: string;
    campaignId?: string;
    action?: string;
    page?: string;
    userAgent?: string;
    [key: string]: any;
  };
  stack?: string;
  data?: any;
  url?: string;
  userAgent?: string;
}

/**
 * フロントエンドからのログエントリを受信して処理
 */
router.post('/', async (req, res) => {
  try {
    const logEntry: FrontendLogEntry = req.body;
    
    // Request context を追加
    const requestContext = {
      ...logEntry.context,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      component: 'frontend'
    };

    // Log level に基づいて適切なログメソッドを呼び出し
    const message = `[Frontend] ${logEntry.message}`;
    
    switch (logEntry.level) {
      case 0: // DEBUG
        logger.debug(message, requestContext, logEntry.data);
        break;
      case 1: // INFO
        logger.info(message, requestContext, logEntry.data);
        break;
      case 2: // WARN
        logger.warn(message, requestContext, logEntry.data);
        break;
      case 3: // ERROR
        logger.error(message, requestContext, {
          ...logEntry.data,
          stack: logEntry.stack,
          url: logEntry.url
        });
        break;
      case 4: // FATAL
        logger.fatal(message, requestContext, {
          ...logEntry.data,
          stack: logEntry.stack,
          url: logEntry.url
        });
        break;
      default:
        logger.info(message, requestContext, logEntry.data);
    }

    res.status(200).json({ status: 'logged' });
  } catch (error) {
    logger.error('Failed to process frontend log entry', { 
      component: 'logs-api' 
    }, error);
    res.status(500).json({ error: 'Failed to process log entry' });
  }
});

/**
 * ログファイルの取得（開発環境のみ）
 */
router.get('/files', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const fs = require('fs');
    const path = require('path');
    
    const logsDir = process.env.LOG_DIR || './logs';
    const files = fs.readdirSync(logsDir);
    
    const logFiles = files
      .filter((file: string) => file.endsWith('.log'))
      .map((file: string) => {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          modified: stats.mtime
        };
      });

    res.json(logFiles);
  } catch (error) {
    logger.error('Failed to list log files', { component: 'logs-api' }, error);
    res.status(500).json({ error: 'Failed to list log files' });
  }
});

/**
 * 特定のログファイルの内容を取得（開発環境のみ）
 */
router.get('/files/:filename', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const fs = require('fs');
    const path = require('path');
    
    const { filename } = req.params;
    const logsDir = process.env.LOG_DIR || './logs';
    const filePath = path.join(logsDir, filename);
    
    // Security check: ensure file is within logs directory
    if (!filePath.startsWith(path.resolve(logsDir))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Log file not found' });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    // Parse JSON lines
    const entries = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });

    res.json(entries);
  } catch (error) {
    logger.error('Failed to read log file', { 
      component: 'logs-api',
      filename: req.params.filename 
    }, error);
    res.status(500).json({ error: 'Failed to read log file' });
  }
});

export default router;