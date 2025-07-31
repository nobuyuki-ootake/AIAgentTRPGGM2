/**
 * セキュリティユーティリティの包括的テスト
 * Security Utilities Comprehensive Tests
 * 
 * テスト対象:
 * - 入力サニタイゼーション（HTML, SQL, ファイルパス, URL）
 * - データ検証（文字列、パスワード強度）
 * - 暗号化ヘルパー（ハッシュ、ソルト、トークン）
 * - レート制限
 * - セキュリティヘッダー
 */


import {
  sanitizeHTML,
  sanitizeSQL,
  sanitizeFilePath,
  sanitizeURL,
  validateSecureString,
  validatePasswordStrength,
  simpleHash,
  generateSalt,
  generateSecureRandom,
  generateTimeBasedToken,
  validateTimeBasedToken,
  RateLimiter,
  generateSecurityHeaders,
  DEFAULT_SECURITY_CONFIG,
  type SecurityConfig
} from '../utils/security';

// ==========================================
// テストスイート
// ==========================================

describe('セキュリティユーティリティの包括的テスト', () => {

  describe('HTML サニタイゼーション', () => {
    test('基本的なHTMLタグの除去', () => {
      const maliciousHTML = '<script>alert("XSS")</script><p>Safe content</p>';
      const sanitized = sanitizeHTML(maliciousHTML);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert("XSS")');
      expect(sanitized).toContain('Safe content');
    });

    test('許可されたタグの保持', () => {
      const htmlWithAllowedTags = '<p>Paragraph</p><b>Bold</b><script>alert("XSS")</script>';
      const sanitized = sanitizeHTML(htmlWithAllowedTags, {
        allowedTags: ['p', 'b'],
        stripTags: true
      });
      
      expect(sanitized).toContain('<p>Paragraph</p>');
      expect(sanitized).toContain('<b>Bold</b>');
      expect(sanitized).not.toContain('<script>');
    });

    test('HTMLエンティティエスケープ', () => {
      const htmlContent = '<div>Test & "quotes" and \'apostrophes\'</div>';
      const sanitized = sanitizeHTML(htmlContent, {
        stripTags: false
      });
      
      expect(sanitized).toContain('&lt;div&gt;');
      expect(sanitized).toContain('&amp;');
      expect(sanitized).toContain('&quot;quotes&quot;');
      expect(sanitized).toContain('&#x27;apostrophes&#x27;');
    });

    test('改行の保持オプション', () => {
      const textWithNewlines = 'Line 1\nLine 2\nLine 3';
      const sanitized = sanitizeHTML(textWithNewlines, {
        preserveNewlines: true,
        stripTags: false
      });
      
      expect(sanitized).toContain('<br>');
      expect(sanitized.split('<br>')).toHaveLength(3);
    });

    test('空文字列と非文字列の処理', () => {
      expect(sanitizeHTML('')).toBe('');
      expect(sanitizeHTML(null as any)).toBe('');
      expect(sanitizeHTML(undefined as any)).toBe('');
      expect(sanitizeHTML(123 as any)).toBe('');
    });

    test('複雑なXSS攻撃パターンの防御', () => {
      const xssPatterns = [
        '<img src="x" onerror="alert(1)">',
        '<svg/onload=alert(1)>',
        'javascript:alert(1)',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<object data="javascript:alert(1)"></object>'
      ];
      
      xssPatterns.forEach(pattern => {
        const sanitized = sanitizeHTML(pattern);
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror=');
        expect(sanitized).not.toContain('onload=');
        expect(sanitized).not.toContain('alert(1)');
      });
    });

    test('Unicode文字の適切な処理', () => {
      const unicodeContent = '<p>日本語テスト 🎲 Special chars: αβγ</p>';
      const sanitized = sanitizeHTML(unicodeContent, {
        allowedTags: ['p']
      });
      
      expect(sanitized).toContain('日本語テスト');
      expect(sanitized).toContain('🎲');
      expect(sanitized).toContain('αβγ');
    });
  });

  describe('SQL サニタイゼーション', () => {
    test('基本的なSQLインジェクション防御', () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const sanitized = sanitizeSQL(maliciousInput);
      
      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain('DROP');
      expect(sanitized).not.toContain('--');
      expect(sanitized).toContain("''''"); // エスケープされたクォート
    });

    test('様々なSQLキーワードの除去', () => {
      const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'UNION', 'CREATE', 'ALTER'];
      
      sqlKeywords.forEach(keyword => {
        const input = `malicious ${keyword} statement`;
        const sanitized = sanitizeSQL(input);
        expect(sanitized.toUpperCase()).not.toContain(keyword);
      });
    });

    test('SQLコメントの除去', () => {
      const inputWithComments = "test /* comment */ value -- line comment";
      const sanitized = sanitizeSQL(inputWithComments);
      
      expect(sanitized).not.toContain('/*');
      expect(sanitized).not.toContain('*/');
      expect(sanitized).not.toContain('--');
      expect(sanitized).toContain('test');
      expect(sanitized).toContain('value');
    });

    test('正常なデータの保持', () => {
      const normalInput = "John O'Connor";
      const sanitized = sanitizeSQL(normalInput);
      
      expect(sanitized).toBe("John O''''Connor"); // エスケープされたアポストロフィ
    });

    test('非文字列入力の処理', () => {
      expect(sanitizeSQL(null as any)).toBe('');
      expect(sanitizeSQL(undefined as any)).toBe('');
      expect(sanitizeSQL(123 as any)).toBe('');
    });
  });

  describe('ファイルパス サニタイゼーション', () => {
    test('基本的なファイルパスの検証', () => {
      const result = sanitizeFilePath('documents/test.txt');
      
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('documents/test.txt');
      expect(result.errors).toHaveLength(0);
    });

    test('パストラバーサル攻撃の防御', () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        'documents/../../../secrets.txt'
      ];
      
      maliciousPaths.forEach(path => {
        const result = sanitizeFilePath(path);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Parent directory'))).toBe(true);
      });
    });

    test('絶対パスの制限', () => {
      const absolutePaths = [
        '/etc/passwd',
        'C:\\Windows\\System32',
        '/home/user/file.txt'
      ];
      
      absolutePaths.forEach(path => {
        const result = sanitizeFilePath(path);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Absolute paths'))).toBe(true);
      });
    });

    test('許可された拡張子の検証', () => {
      const allowedExtensions = ['txt', 'pdf', 'doc'];
      
      const validFile = sanitizeFilePath('document.txt', { allowedExtensions });
      expect(validFile.isValid).toBe(true);
      
      const invalidFile = sanitizeFilePath('script.exe', { allowedExtensions });
      expect(invalidFile.isValid).toBe(false);
      expect(invalidFile.errors.some(e => e.includes('extension not allowed'))).toBe(true);
    });

    test('Windows予約ファイル名の検証', () => {
      const reservedNames = ['CON.txt', 'PRN.pdf', 'AUX.doc', 'NUL.txt'];
      
      reservedNames.forEach(name => {
        const result = sanitizeFilePath(name);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Reserved file name'))).toBe(true);
      });
    });

    test('危険な文字の除去', () => {
      const dangerousPath = 'file<>:"|?*.txt';
      const result = sanitizeFilePath(dangerousPath);
      
      expect(result.sanitized).not.toContain('<');
      expect(result.sanitized).not.toContain('>');
      expect(result.sanitized).not.toContain(':');
      expect(result.sanitized).not.toContain('|');
      expect(result.sanitized).not.toContain('?');
      expect(result.sanitized).not.toContain('*');
    });

    test('設定オプションによる動作変更', () => {
      // 絶対パスを許可
      const absoluteResult = sanitizeFilePath('/home/user/file.txt', { allowAbsolute: true });
      expect(absoluteResult.isValid).toBe(true);
      
      // 親ディレクトリアクセスを許可
      const parentResult = sanitizeFilePath('../file.txt', { allowParentDirectory: true });
      expect(parentResult.isValid).toBe(true);
    });
  });

  describe('URL サニタイゼーション', () => {
    test('有効なURLの検証', () => {
      const validURLs = [
        'https://example.com',
        'http://localhost:3000',
        'https://api.example.com/endpoint?param=value'
      ];
      
      validURLs.forEach(url => {
        const result = sanitizeURL(url);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('危険なプロトコルの防御', () => {
      const dangerousURLs = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
        'file:///etc/passwd'
      ];
      
      dangerousURLs.forEach(url => {
        const result = sanitizeURL(url);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Dangerous protocol') || e.includes('Protocol not allowed'))).toBe(true);
      });
    });

    test('プライベートIPアドレスの制限', () => {
      const privateIPs = [
        'http://192.168.1.1',
        'http://10.0.0.1',
        'http://172.16.0.1',
        'http://127.0.0.1'
      ];
      
      privateIPs.forEach(url => {
        const result = sanitizeURL(url);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Private IP address'))).toBe(true);
      });
    });

    test('無効なURL形式の検証', () => {
      const invalidURLs = [
        'not-a-url',
        'htp://example.com', // タイポ
        'https://',
        'https://[invalid-host'
      ];
      
      invalidURLs.forEach(url => {
        const result = sanitizeURL(url);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Invalid URL format'))).toBe(true);
      });
    });

    test('カスタム許可プロトコル', () => {
      const ftpURL = 'ftp://files.example.com/file.txt';
      
      // デフォルトでは無効
      const defaultResult = sanitizeURL(ftpURL);
      expect(defaultResult.isValid).toBe(false);
      
      // FTPを許可
      const customResult = sanitizeURL(ftpURL, ['http:', 'https:', 'ftp:']);
      expect(customResult.isValid).toBe(true);
    });
  });

  describe('セキュア文字列検証', () => {
    test('基本的な文字列検証', () => {
      const validString = 'Hello World 123';
      const errors = validateSecureString(validString, {
        minLength: 5,
        maxLength: 50
      });
      
      expect(errors).toHaveLength(0);
    });

    test('長さ制限の検証', () => {
      const shortString = 'Hi';
      const longString = 'A'.repeat(1000);
      
      const shortErrors = validateSecureString(shortString, { minLength: 5 });
      expect(shortErrors.some(e => e.code === 'MIN_LENGTH')).toBe(true);
      
      const longErrors = validateSecureString(longString, { maxLength: 100 });
      expect(longErrors.some(e => e.code === 'MAX_LENGTH')).toBe(true);
    });

    test('特殊文字の制限', () => {
      const stringWithSpecialChars = 'Hello@World!';
      
      const allowedResult = validateSecureString(stringWithSpecialChars, {
        allowSpecialChars: true
      });
      expect(allowedResult).toHaveLength(0);
      
      const disallowedResult = validateSecureString(stringWithSpecialChars, {
        allowSpecialChars: false
      });
      expect(disallowedResult.some(e => e.code === 'SPECIAL_CHARS_NOT_ALLOWED')).toBe(true);
    });

    test('Unicode文字の制限', () => {
      const unicodeString = 'Hello 世界 🌍';
      
      const allowedResult = validateSecureString(unicodeString, {
        allowUnicode: true
      });
      expect(allowedResult).toHaveLength(0);
      
      const disallowedResult = validateSecureString(unicodeString, {
        allowUnicode: false
      });
      expect(disallowedResult.some(e => e.code === 'UNICODE_NOT_ALLOWED')).toBe(true);
    });

    test('禁止パターンの検証', () => {
      const suspiciousString = 'admin password';
      const forbiddenPatterns = [/admin/i, /password/i];
      
      const errors = validateSecureString(suspiciousString, {
        forbiddenPatterns
      });
      
      expect(errors.some(e => e.code === 'FORBIDDEN_PATTERN')).toBe(true);
    });

    test('必須パターンの検証', () => {
      const string = 'test123';
      const requiredPatterns = [/\d/, /[a-z]/]; // 数字と小文字が必要
      
      const validErrors = validateSecureString(string, { requiredPatterns });
      expect(validErrors).toHaveLength(0);
      
      const invalidString = 'TESTONLY';
      const invalidErrors = validateSecureString(invalidString, { requiredPatterns });
      expect(invalidErrors.some(e => e.code === 'REQUIRED_PATTERN_MISSING')).toBe(true);
    });

    test('非文字列入力の処理', () => {
      const errors = validateSecureString(123 as any);
      expect(errors.some(e => e.code === 'INVALID_TYPE')).toBe(true);
    });
  });

  describe('パスワード強度検証', () => {
    test('強いパスワードの検証', () => {
      const strongPassword = 'MyStrongP@ssw0rd!';
      const result = validatePasswordStrength(strongPassword);
      
      expect(result.isValid).toBe(true);
      expect(result.strength).toBe('strong');
      expect(result.score).toBeGreaterThan(60);
      expect(result.errors).toHaveLength(0);
    });

    test('弱いパスワードの検証', () => {
      const weakPasswords = [
        'password',
        '123456',
        'abc123',
        'qwerty'
      ];
      
      weakPasswords.forEach(password => {
        const result = validatePasswordStrength(password);
        expect(result.strength).toBe('weak');
        expect(result.score).toBeLessThan(30);
      });
    });

    test('文字種別要件の検証', () => {
      const noUppercase = 'lowercase123!';
      const result1 = validatePasswordStrength(noUppercase);
      expect(result1.errors.some(e => e.code === 'REQUIRE_UPPERCASE')).toBe(true);
      
      const noLowercase = 'UPPERCASE123!';
      const result2 = validatePasswordStrength(noLowercase);
      expect(result2.errors.some(e => e.code === 'REQUIRE_LOWERCASE')).toBe(true);
      
      const noNumbers = 'PasswordOnly!';
      const result3 = validatePasswordStrength(noNumbers);
      expect(result3.errors.some(e => e.code === 'REQUIRE_NUMBERS')).toBe(true);
      
      const noSpecialChars = 'Password123';
      const result4 = validatePasswordStrength(noSpecialChars);
      expect(result4.errors.some(e => e.code === 'REQUIRE_SPECIAL_CHARS')).toBe(true);
    });

    test('長さ要件の検証', () => {
      const shortPassword = 'Ab1!';
      const result = validatePasswordStrength(shortPassword, { minLength: 8 });
      
      expect(result.errors.some(e => e.code === 'MIN_LENGTH')).toBe(true);
    });

    test('禁止パスワードの検証', () => {
      const commonPassword = 'password123';
      const result = validatePasswordStrength(commonPassword, {
        forbiddenPasswords: ['password123', 'admin123']
      });
      
      expect(result.errors.some(e => e.code === 'COMMON_PASSWORD')).toBe(true);
      expect(result.score).toBe(0);
    });

    test('連続文字の検証', () => {
      const repeatedPassword = 'Passsssword1!';
      const result = validatePasswordStrength(repeatedPassword);
      
      expect(result.errors.some(e => e.code === 'REPEATED_CHARACTERS')).toBe(true);
    });

    test('カスタム要件の設定', () => {
      const password = 'mypassword';
      const result = validatePasswordStrength(password, {
        requireUppercase: false,
        requireNumbers: false,
        requireSpecialChars: false,
        minLength: 5
      });
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('暗号化ヘルパー', () => {
    test('ハッシュ関数の一貫性', () => {
      const input = 'test string';
      const salt = 'salt123';
      
      const hash1 = simpleHash(input, salt);
      const hash2 = simpleHash(input, salt);
      
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBeGreaterThan(0);
    });

    test('異なる入力で異なるハッシュ', () => {
      const hash1 = simpleHash('input1');
      const hash2 = simpleHash('input2');
      
      expect(hash1).not.toBe(hash2);
    });

    test('ソルトの影響', () => {
      const input = 'test';
      const hash1 = simpleHash(input, 'salt1');
      const hash2 = simpleHash(input, 'salt2');
      
      expect(hash1).not.toBe(hash2);
    });

    test('ソルト生成', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      
      expect(salt1).not.toBe(salt2);
      expect(salt1.length).toBe(16); // デフォルト長
      expect(/^[a-zA-Z0-9]+$/.test(salt1)).toBe(true);
    });

    test('カスタム長のソルト生成', () => {
      const customSalt = generateSalt(32);
      expect(customSalt.length).toBe(32);
    });

    test('セキュアランダム数生成', () => {
      const random1 = generateSecureRandom();
      const random2 = generateSecureRandom();
      
      expect(random1).toBeGreaterThanOrEqual(0);
      expect(random1).toBeLessThan(1);
      expect(random1).not.toBe(random2);
    });

    test('範囲指定のセキュアランダム数', () => {
      const random = generateSecureRandom(10, 20);
      expect(random).toBeGreaterThanOrEqual(10);
      expect(random).toBeLessThan(20);
    });

    test('Crypto API フォールバック', () => {
      // Crypto API を無効化
      const originalCrypto = global.crypto;
      delete (global as any).crypto;
      
      const salt = generateSalt(10);
      expect(salt.length).toBe(10);
      expect(/^[a-zA-Z0-9]+$/.test(salt)).toBe(true);
      
      const random = generateSecureRandom();
      expect(random).toBeGreaterThanOrEqual(0);
      expect(random).toBeLessThan(1);
      
      // Crypto API を復元
      global.crypto = originalCrypto;
    });
  });

  describe('時間ベースのトークン', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('トークンの生成と検証', () => {
      const identifier = 'user123';
      const secret = 'secret_key';
      
      const token = generateTimeBasedToken(identifier, secret);
      const isValid = validateTimeBasedToken(token, identifier, secret);
      
      expect(isValid).toBe(true);
      expect(typeof token).toBe('string');
      expect(token.includes('.')).toBe(true);
    });

    test('異なる識別子での検証失敗', () => {
      const token = generateTimeBasedToken('user123', 'secret');
      const isValid = validateTimeBasedToken(token, 'user456', 'secret');
      
      expect(isValid).toBe(false);
    });

    test('異なるシークレットでの検証失敗', () => {
      const token = generateTimeBasedToken('user123', 'secret1');
      const isValid = validateTimeBasedToken(token, 'user123', 'secret2');
      
      expect(isValid).toBe(false);
    });

    test('時間経過によるトークンの無効化', () => {
      const identifier = 'user123';
      const secret = 'secret';
      const validityPeriod = 3600000; // 1時間
      
      const token = generateTimeBasedToken(identifier, secret, validityPeriod);
      
      // 即座には有効
      expect(validateTimeBasedToken(token, identifier, secret, validityPeriod)).toBe(true);
      
      // 2時間後（許可スキューを超える）
      jest.advanceTimersByTime(2 * validityPeriod + 1000);
      expect(validateTimeBasedToken(token, identifier, secret, validityPeriod)).toBe(false);
    });

    test('許可スキュー内での検証', () => {
      const identifier = 'user123';
      const secret = 'secret';
      const validityPeriod = 3600000;
      const allowedSkew = 1;
      
      const token = generateTimeBasedToken(identifier, secret, validityPeriod);
      
      // スキュー内の時間進行
      jest.advanceTimersByTime(validityPeriod);
      expect(validateTimeBasedToken(token, identifier, secret, validityPeriod, allowedSkew)).toBe(true);
    });

    test('無効なトークン形式の処理', () => {
      const invalidTokens = [
        'invalid.token.format',
        'notimestamp.hash',
        'abc.def',
        ''
      ];
      
      invalidTokens.forEach(token => {
        const isValid = validateTimeBasedToken(token, 'user', 'secret');
        expect(isValid).toBe(false);
      });
    });
  });

  describe('レート制限', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('基本的なレート制限', () => {
      const limiter = new RateLimiter(60000, 3); // 1分間に3リクエスト
      const identifier = 'user123';
      
      // 最初の3リクエストは許可
      for (let i = 0; i < 3; i++) {
        const result = limiter.check(identifier);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(2 - i);
      }
      
      // 4番目のリクエストは拒否
      const result = limiter.check(identifier);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    test('時間ウィンドウのリセット', () => {
      const limiter = new RateLimiter(60000, 2);
      const identifier = 'user123';
      
      // リミットまで使用
      limiter.check(identifier);
      limiter.check(identifier);
      expect(limiter.check(identifier).allowed).toBe(false);
      
      // 時間ウィンドウを進める
      jest.advanceTimersByTime(60001);
      
      // 新しいウィンドウで再び許可
      const result = limiter.check(identifier);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });

    test('異なる識別子の独立性', () => {
      const limiter = new RateLimiter(60000, 2);
      
      // user1のリミットを消費
      limiter.check('user1');
      limiter.check('user1');
      expect(limiter.check('user1').allowed).toBe(false);
      
      // user2は影響を受けない
      const result = limiter.check('user2');
      expect(result.allowed).toBe(true);
    });

    test('手動リセット', () => {
      const limiter = new RateLimiter(60000, 1);
      const identifier = 'user123';
      
      // リミットを消費
      limiter.check(identifier);
      expect(limiter.check(identifier).allowed).toBe(false);
      
      // 手動リセット
      limiter.reset(identifier);
      
      // 再び利用可能
      const result = limiter.check(identifier);
      expect(result.allowed).toBe(true);
    });

    test('クリーンアップ機能', () => {
      const limiter = new RateLimiter(60000, 1);
      
      // 複数の識別子でリクエスト
      limiter.check('user1');
      limiter.check('user2');
      limiter.check('user3');
      
      // 時間を進める
      jest.advanceTimersByTime(60001);
      
      // クリーンアップ実行
      limiter.cleanup();
      
      // 新しいリクエストが正常に動作することを確認
      const result = limiter.check('user1');
      expect(result.allowed).toBe(true);
    });

    test('resetTimeの正確性', () => {
      const windowMs = 60000;
      const limiter = new RateLimiter(windowMs, 1);
      const currentTime = Date.now();
      
      const result = limiter.check('user123');
      
      expect(result.resetTime).toBeCloseTo(currentTime + windowMs, -2);
    });
  });

  describe('セキュリティヘッダー', () => {
    test('デフォルトセキュリティヘッダーの生成', () => {
      const headers = generateSecurityHeaders();
      
      expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
      expect(headers['Strict-Transport-Security']).toContain('max-age=31536000');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });

    test('カスタムCSPディレクティブ', () => {
      const customCSP = {
        'script-src': "'self' 'unsafe-eval'",
        'img-src': "'self' data: blob:"
      };
      
      const headers = generateSecurityHeaders({
        cspDirectives: customCSP
      });
      
      expect(headers['Content-Security-Policy']).toContain("script-src 'self' 'unsafe-eval'");
      expect(headers['Content-Security-Policy']).toContain("img-src 'self' data: blob:");
    });

    test('個別ヘッダーの無効化', () => {
      const headers = generateSecurityHeaders({
        enableCSP: false,
        enableHSTS: false,
        enableXFrame: false,
        enableXContent: false
      });
      
      expect(headers['Content-Security-Policy']).toBeUndefined();
      expect(headers['Strict-Transport-Security']).toBeUndefined();
      expect(headers['X-Frame-Options']).toBeUndefined();
      expect(headers['X-Content-Type-Options']).toBeUndefined();
      
      // 常に設定されるヘッダー
      expect(headers['X-XSS-Protection']).toBeDefined();
      expect(headers['Referrer-Policy']).toBeDefined();
    });

    test('CSPディレクティブの形式', () => {
      const headers = generateSecurityHeaders();
      const csp = headers['Content-Security-Policy'];
      
      // CSPの形式が正しいことを確認
      expect(csp).toMatch(/default-src\s+'self'/);
      expect(csp).toMatch(/script-src\s+'self'\s+'unsafe-inline'/);
      expect(csp).toMatch(/style-src\s+'self'\s+'unsafe-inline'/);
    });
  });

  describe('設定とデフォルト値', () => {
    test('デフォルトセキュリティ設定の妥当性', () => {
      expect(DEFAULT_SECURITY_CONFIG.maxStringLength).toBeGreaterThan(0);
      expect(DEFAULT_SECURITY_CONFIG.allowedHTMLTags).toBeInstanceOf(Array);
      expect(DEFAULT_SECURITY_CONFIG.allowedProtocols).toBeInstanceOf(Array);
      expect(DEFAULT_SECURITY_CONFIG.rateLimitWindow).toBeGreaterThan(0);
      expect(DEFAULT_SECURITY_CONFIG.maxRequestsPerWindow).toBeGreaterThan(0);
      expect(typeof DEFAULT_SECURITY_CONFIG.enableStrictMode).toBe('boolean');
    });

    test('セキュリティ設定の型安全性', () => {
      const config: SecurityConfig = {
        maxStringLength: 5000,
        allowedHTMLTags: ['p', 'br'],
        allowedProtocols: ['https:'],
        enableStrictMode: true,
        rateLimitWindow: 30000,
        maxRequestsPerWindow: 50
      };
      
      expect(typeof config.maxStringLength).toBe('number');
      expect(Array.isArray(config.allowedHTMLTags)).toBe(true);
      expect(Array.isArray(config.allowedProtocols)).toBe(true);
      expect(typeof config.enableStrictMode).toBe('boolean');
    });
  });

  describe('統合テストとエッジケース', () => {
    test('複数のセキュリティ機能の組み合わせ', () => {
      const userInput = '<script>alert("XSS")</script>Hello World!';
      
      // HTMLサニタイゼーション
      const sanitizedHTML = sanitizeHTML(userInput);
      
      // 文字列検証
      const validationErrors = validateSecureString(sanitizedHTML, {
        maxLength: 100,
        allowSpecialChars: true
      });
      
      expect(sanitizedHTML).not.toContain('<script>');
      expect(sanitizedHTML).toContain('Hello World!');
      expect(validationErrors).toHaveLength(0);
    });

    test('大量データでのパフォーマンス', () => {
      const largeString = 'A'.repeat(10000);
      
      const startTime = Date.now();
      
      const sanitized = sanitizeHTML(largeString);
      const errors = validateSecureString(sanitized, { maxLength: 20000 });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // 1秒以内
      expect(sanitized).toBe(largeString);
      expect(errors).toHaveLength(0);
    });

    test('空値とnull値の一貫した処理', () => {
      const emptyValues = ['', null, undefined];
      
      emptyValues.forEach(value => {
        expect(sanitizeHTML(value as any)).toBe('');
        expect(sanitizeSQL(value as any)).toBe('');
        
        if (value !== '') {
          const errors = validateSecureString(value as any);
          expect(errors.length).toBeGreaterThan(0);
        }
      });
    });

    test('Unicode とエモジの適切な処理', () => {
      const unicodeString = '👋 Hello 世界! 🌍 Testing αβγ';
      
      const sanitizedHTML = sanitizeHTML(unicodeString);
      const urlResult = sanitizeURL(`https://example.com/search?q=${encodeURIComponent(unicodeString)}`);
      const validationErrors = validateSecureString(unicodeString, { allowUnicode: true });
      
      expect(sanitizedHTML).toContain('👋');
      expect(sanitizedHTML).toContain('世界');
      expect(sanitizedHTML).toContain('🌍');
      expect(urlResult.isValid).toBe(true);
      expect(validationErrors).toHaveLength(0);
    });

    test('異なるエンコーディングの処理', () => {
      const encodedStrings = [
        '%3Cscript%3Ealert%281%29%3C/script%3E', // URL encoded
        '&lt;script&gt;alert(1)&lt;/script&gt;', // HTML entities
        '\u003cscript\u003ealert(1)\u003c/script\u003e' // Unicode escapes
      ];
      
      encodedStrings.forEach(str => {
        const sanitized = sanitizeHTML(decodeURIComponent(str));
        expect(sanitized).not.toContain('script');
        expect(sanitized).not.toContain('alert');
      });
    });
  });
});