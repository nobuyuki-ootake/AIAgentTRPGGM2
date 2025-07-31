import { logger } from '../../utils/logger-simple';

describe('Logger Simple Utility', () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
      debug: jest.spyOn(console, 'debug').mockImplementation()
    };
  });

  afterEach(() => {
    Object.values(consoleSpy).forEach((spy: any) => spy.mockRestore());
  });

  test('should log info messages correctly', () => {
    logger.info('Test message');
    expect(consoleSpy.log).toHaveBeenCalledWith('[INFO] Test message {}');
  });

  test('should log warn messages correctly', () => {
    logger.warn('Warning message');
    expect(consoleSpy.warn).toHaveBeenCalledWith('[WARN] Warning message {}');
  });

  test('should log error messages correctly', () => {
    logger.error('Error message');
    expect(consoleSpy.error).toHaveBeenCalledWith('[ERROR] Error message {}');
  });

  test('should log debug messages correctly', () => {
    logger.debug('Debug message');
    expect(consoleSpy.debug).toHaveBeenCalledWith('[DEBUG] Debug message {}');
  });

  test('should log fatal messages correctly', () => {
    logger.fatal('Fatal message');
    expect(consoleSpy.error).toHaveBeenCalledWith('[FATAL] Fatal message {}');
  });

  test('should handle context objects', () => {
    const context = { userId: '123', action: 'test' };
    logger.info('Message with context', context);
    expect(consoleSpy.log).toHaveBeenCalledWith('[INFO] Message with context {"userId":"123","action":"test"}');
  });

  test('should handle data parameter', () => {
    const context = { userId: '123' };
    const data = { result: 'success' };
    logger.info('Message with data', context, data);
    expect(consoleSpy.log).toHaveBeenCalledWith('[INFO] Message with data {"userId":"123"} {"result":"success"}');
  });

  test('should return logger instance from setContext', () => {
    const result = logger.setContext({ test: true });
    expect(result).toBe(logger);
  });

  test('should return logger instance from child', () => {
    const result = logger.child({ module: 'test' });
    expect(result).toBe(logger);
  });
});