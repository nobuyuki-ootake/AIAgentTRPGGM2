// 一時的な簡易ログ実装 - 互換性のため3つのパラメータをサポート
export const logger = {
  info: (message: string, context?: any, data?: any) => {
    const output = data ? `${message} ${JSON.stringify(context || {})} ${JSON.stringify(data)}` : `${message} ${JSON.stringify(context || {})}`;
    console.log(`[INFO] ${output}`);
  },
  warn: (message: string, context?: any, data?: any) => {
    const output = data ? `${message} ${JSON.stringify(context || {})} ${JSON.stringify(data)}` : `${message} ${JSON.stringify(context || {})}`;
    console.warn(`[WARN] ${output}`);
  },
  error: (message: string, context?: any, data?: any) => {
    const output = data ? `${message} ${JSON.stringify(context || {})} ${JSON.stringify(data)}` : `${message} ${JSON.stringify(context || {})}`;
    console.error(`[ERROR] ${output}`);
  },
  debug: (message: string, context?: any, data?: any) => {
    const output = data ? `${message} ${JSON.stringify(context || {})} ${JSON.stringify(data)}` : `${message} ${JSON.stringify(context || {})}`;
    console.debug(`[DEBUG] ${output}`);
  },
  fatal: (message: string, context?: any, data?: any) => {
    const output = data ? `${message} ${JSON.stringify(context || {})} ${JSON.stringify(data)}` : `${message} ${JSON.stringify(context || {})}`;
    console.error(`[FATAL] ${output}`);
  },
  setContext: (_context: any) => logger,
  child: (_context: any) => logger
};