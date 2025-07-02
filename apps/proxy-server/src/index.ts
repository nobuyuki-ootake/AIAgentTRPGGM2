import 'dotenv/config';
import { createApp } from './app';
import { logger } from './utils/logger';
import { initializeDatabase } from './database/database';
import { initializeMastra } from './mastra';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { getSessionService } from './services/sessionService';

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer(): Promise<void> {
  try {
    // データベース初期化
    logger.info('Initializing database...');
    await initializeDatabase();
    logger.info('Database initialized successfully');

    // Mastra AI Agent System初期化
    logger.info('Initializing Mastra AI Agent System...');
    try {
      await initializeMastra();
      logger.info('Mastra AI Agent System initialized successfully');
    } catch (mastraError) {
      logger.warn('Mastra initialization failed, continuing without AI Agents:', mastraError);
      logger.warn('AI Agent features will be unavailable until configuration is fixed');
    }

    // Express アプリケーション作成
    const app = createApp();

    // HTTP サーバー作成
    const server = createServer(app);

    // Socket.IO サーバー設定
    const io = new SocketIOServer(server, {
      cors: {
        origin: NODE_ENV === 'development' 
          ? ["http://localhost:5173", "http://localhost:3000"] 
          : process.env.FRONTEND_URL || false,
        methods: ["GET", "POST"]
      }
    });

    // WebSocket接続処理
    io.on('connection', (socket) => {
      logger.info(`WebSocket client connected: ${socket.id}`);

      // セッション参加
      socket.on('join-session', (sessionId: string) => {
        socket.join(`session-${sessionId}`);
        logger.info(`Client ${socket.id} joined session ${sessionId}`);
      });

      // セッション離脱
      socket.on('leave-session', (sessionId: string) => {
        socket.leave(`session-${sessionId}`);
        logger.info(`Client ${socket.id} left session ${sessionId}`);
      });

      // 接続解除
      socket.on('disconnect', () => {
        logger.info(`WebSocket client disconnected: ${socket.id}`);
      });
    });

    // Socket.IOインスタンスをappとサービスに追加
    app.set('socketio', io);
    
    // SessionServiceにSocket.IOインスタンスを設定
    getSessionService().setSocketIO(io);
    logger.info('SessionService configured with Socket.IO instance');

    // Phase 4-1: MilestoneCompletionServiceにアプリインスタンスを設定
    const { milestoneCompletionService } = await import('./services/milestoneCompletionService');
    milestoneCompletionService.setApp(app);
    logger.info('MilestoneCompletionService configured with Express app instance');

    // Phase 4-2: MilestoneManagementServiceにアプリインスタンスを設定
    const { MilestoneManagementService } = await import('./services/milestoneManagementService');
    const milestoneManagementService = MilestoneManagementService.getInstance();
    milestoneManagementService.setApp(app);
    logger.info('MilestoneManagementService configured with Express app instance');

    // Phase 4-2.3: StoryProgressionServiceにアプリインスタンスを設定
    const { storyProgressionService } = await import('./services/storyProgressionService');
    storyProgressionService.setApp(app);
    logger.info('StoryProgressionService configured with Express app instance');

    // Phase 4-4.1: NarrativeFeedbackServiceにアプリインスタンスを設定
    const { narrativeFeedbackService } = await import('./services/narrativeFeedbackService');
    narrativeFeedbackService.setApp(app);
    logger.info('NarrativeFeedbackService configured with Express app instance');

    // サーバー起動
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} in ${NODE_ENV} mode`);
      logger.info(`📍 API endpoint: http://localhost:${PORT}/api`);
      logger.info(`🤖 AI Agent endpoint: http://localhost:${PORT}/api/ai-agent`);
      logger.info(`🎭 Mastra Agent endpoint: http://localhost:${PORT}/api/mastra-agent`);
      logger.info(`🔌 WebSocket endpoint: ws://localhost:${PORT}`);
      logger.info(`🏥 Health check: http://localhost:${PORT}/api/mastra-agent/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`📡 Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async (err) => {
        if (err) {
          logger.error('Error during server shutdown:', err);
          process.exit(1);
        }
        
        logger.info('✅ Server closed successfully');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// 未キャッチ例外のハンドリング
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// サーバー起動
startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});