import { logger } from '../utils/logger';

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByComponent: Record<string, number>;
  errorsByStatus: Record<number, number>;
  recentErrors: ErrorEvent[];
}

export interface ErrorEvent {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  component: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  statusCode?: number;
  userId?: string;
  sessionId?: string;
  campaignId?: string;
  stack?: string;
  context?: Record<string, any>;
  resolved?: boolean;
  resolvedAt?: string;
}

export interface ErrorPattern {
  type: string;
  pattern: string;
  threshold: number;
  timeWindow: number; // minutes
  severity: 'low' | 'medium' | 'high' | 'critical';
  lastDetected?: string;
  count: number;
}

class ErrorMonitoringService {
  private errors: ErrorEvent[] = [];
  private errorPatterns: ErrorPattern[] = [];
  private maxErrorHistory = 1000;
  private alertThresholds = {
    low: 10,
    medium: 5,
    high: 3,
    critical: 1
  };

  constructor() {
    this.initializeErrorPatterns();
    this.startCleanupTask();
  }

  private initializeErrorPatterns(): void {
    this.errorPatterns = [
      {
        type: 'ai_service_failure',
        pattern: 'AI service.*failed',
        threshold: 3,
        timeWindow: 10,
        severity: 'high',
        count: 0
      },
      {
        type: 'database_error',
        pattern: 'Database.*error',
        threshold: 5,
        timeWindow: 5,
        severity: 'critical',
        count: 0
      },
      {
        type: 'authentication_failure',
        pattern: 'Authentication.*failed',
        threshold: 10,
        timeWindow: 15,
        severity: 'medium',
        count: 0
      },
      {
        type: 'session_timeout',
        pattern: 'Session.*timeout',
        threshold: 5,
        timeWindow: 10,
        severity: 'medium',
        count: 0
      },
      {
        type: 'memory_leak',
        pattern: 'Memory.*limit',
        threshold: 1,
        timeWindow: 5,
        severity: 'critical',
        count: 0
      }
    ];
  }

  private startCleanupTask(): void {
    // Clean up old errors every hour
    setInterval(() => {
      this.cleanupOldErrors();
    }, 60 * 60 * 1000);
  }

  private cleanupOldErrors(): void {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    this.errors = this.errors.filter(error => 
      new Date(error.timestamp) > twentyFourHoursAgo
    );

    if (this.errors.length > this.maxErrorHistory) {
      this.errors = this.errors.slice(-this.maxErrorHistory);
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private detectSeverity(error: any): 'low' | 'medium' | 'high' | 'critical' {
    // Status code based severity
    if (error.statusCode >= 500) return 'critical';
    if (error.statusCode >= 400) return 'high';
    
    // Message pattern based severity
    const message = error.message?.toLowerCase() || '';
    if (message.includes('database') || message.includes('connection')) return 'critical';
    if (message.includes('timeout') || message.includes('limit')) return 'high';
    if (message.includes('validation') || message.includes('format')) return 'medium';
    
    return 'low';
  }

  private checkErrorPatterns(errorEvent: ErrorEvent): void {
    const message = errorEvent.message;
    
    for (const pattern of this.errorPatterns) {
      const regex = new RegExp(pattern.pattern, 'i');
      if (regex.test(message)) {
        pattern.count++;
        pattern.lastDetected = new Date().toISOString();
        
        // Check if pattern threshold is exceeded
        const recentErrors = this.errors.filter(e => 
          new Date(e.timestamp) > new Date(Date.now() - pattern.timeWindow * 60 * 1000) &&
          regex.test(e.message)
        );
        
        if (recentErrors.length >= pattern.threshold) {
          this.triggerAlert(pattern, recentErrors);
        }
      }
    }
  }

  private triggerAlert(pattern: ErrorPattern, errors: ErrorEvent[]): void {
    const alert = {
      type: 'error_pattern_detected',
      pattern: pattern.type,
      severity: pattern.severity,
      count: errors.length,
      timeWindow: pattern.timeWindow,
      threshold: pattern.threshold,
      errors: errors.map(e => ({ id: e.id, message: e.message, timestamp: e.timestamp }))
    };

    logger.error('Error pattern detected', {
      component: 'error-monitoring',
      pattern: pattern.type,
      severity: pattern.severity
    }, alert);

    // Here you could integrate with external alerting services
    // like Slack, PagerDuty, etc.
  }

  logError(
    error: any,
    component: string,
    context?: Record<string, any>
  ): ErrorEvent {
    const errorEvent: ErrorEvent = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      type: error.constructor.name || 'UnknownError',
      message: error.message || 'Unknown error occurred',
      component,
      severity: this.detectSeverity(error),
      statusCode: error.statusCode || error.status,
      userId: context?.userId,
      sessionId: context?.sessionId,
      campaignId: context?.campaignId,
      stack: error.stack,
      context,
      resolved: false
    };

    this.errors.push(errorEvent);
    this.checkErrorPatterns(errorEvent);

    // Log to structured logger
    logger.error(errorEvent.message, {
      component,
      errorId: errorEvent.id,
      errorType: errorEvent.type,
      severity: errorEvent.severity,
      userId: errorEvent.userId,
      sessionId: errorEvent.sessionId,
      campaignId: errorEvent.campaignId
    }, {
      stack: errorEvent.stack,
      context: errorEvent.context
    });

    return errorEvent;
  }

  getErrorMetrics(): ErrorMetrics {
    const now = Date.now();
    const last24Hours = now - 24 * 60 * 60 * 1000;
    
    const recentErrors = this.errors.filter(e => 
      new Date(e.timestamp).getTime() > last24Hours
    );

    const errorsByType: Record<string, number> = {};
    const errorsByComponent: Record<string, number> = {};
    const errorsByStatus: Record<number, number> = {};

    recentErrors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsByComponent[error.component] = (errorsByComponent[error.component] || 0) + 1;
      
      if (error.statusCode) {
        errorsByStatus[error.statusCode] = (errorsByStatus[error.statusCode] || 0) + 1;
      }
    });

    return {
      totalErrors: recentErrors.length,
      errorsByType,
      errorsByComponent,
      errorsByStatus,
      recentErrors: recentErrors.slice(-20) // Last 20 errors
    };
  }

  getErrorsByComponent(component: string): ErrorEvent[] {
    return this.errors.filter(error => error.component === component);
  }

  getErrorsBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): ErrorEvent[] {
    return this.errors.filter(error => error.severity === severity);
  }

  resolveError(errorId: string): boolean {
    const error = this.errors.find(e => e.id === errorId);
    if (error) {
      error.resolved = true;
      error.resolvedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  getErrorPatterns(): ErrorPattern[] {
    return this.errorPatterns;
  }

  clearErrors(): void {
    this.errors = [];
    this.errorPatterns.forEach(pattern => {
      pattern.count = 0;
      pattern.lastDetected = undefined;
    });
  }
}

export const errorMonitoringService = new ErrorMonitoringService();