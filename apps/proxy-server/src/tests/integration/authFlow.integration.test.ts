/**
 * Authentication Flow Integration Tests
 * Testing login, token refresh, session management with database persistence
 * Using t-WADA naming conventions and production types
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import { Server } from 'http';
import { Database as DatabaseType } from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { 
  TRPGCampaign, 
  TRPGSession, 
  TRPGCharacter, 
  APIResponse 
} from '@ai-agent-trpg/types';
import { authRouter } from '../../routes/auth';
import { campaignsRouter } from '../../routes/campaigns';
import { sessionsRouter } from '../../routes/sessions';
import { authMiddleware } from '../../middleware/auth.middleware';
import { errorHandler } from '../../middleware/errorHandler';
import { fullIntegrationMockSetup, MockServerServices } from '../mocks';
import { testDatabase, TestDataFactory } from '../setup/testDatabase';

describe('Authentication Flow Integration Tests', () => {
  let app: Express;
  let server: Server;
  let db: DatabaseType;
  let mockServices: MockServerServices;
  let testUsers: any[] = [];
  let jwtSecret: string;

  beforeAll(async () => {
    jwtSecret = 'test-jwt-secret-key-for-testing-only';
    process.env.JWT_SECRET = jwtSecret;
    
    // Set up test database
    db = testDatabase.createTestDatabase();
    setupAuthTables(db);
    
    // Set up express app with auth middleware
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    app.use('/api/campaigns', authMiddleware, campaignsRouter);
    app.use('/api/sessions', authMiddleware, sessionsRouter);
    app.use(errorHandler);

    // Initialize mock services
    mockServices = await fullIntegrationMockSetup();
    
    // Start server
    server = app.listen(0);
  });

  afterAll(async () => {
    await mockServices.cleanup();
    testDatabase.closeAllDatabases();
    server.close();
    delete process.env.JWT_SECRET;
  });

  beforeEach(async () => {
    testDatabase.resetDatabase(db);
    setupAuthTables(db);
    await mockServices.reset();
    
    // Create test users
    testUsers = [
      {
        id: 'user-gm-1',
        email: 'gamemaster@test.com',
        username: 'gamemaster',
        password: 'SecurePassword123!',
        role: 'gm',
        isActive: true
      },
      {
        id: 'user-player-1',
        email: 'player1@test.com',
        username: 'player1',
        password: 'PlayerPass456!',
        role: 'player',
        isActive: true
      },
      {
        id: 'user-player-2',
        email: 'player2@test.com',
        username: 'player2',
        password: 'PlayerPass789!',
        role: 'player',
        isActive: true
      },
      {
        id: 'user-suspended',
        email: 'suspended@test.com',
        username: 'suspended',
        password: 'SuspendedPass!',
        role: 'player',
        isActive: false
      }
    ];

    // Insert test users into database
    for (const user of testUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 12);
      db.prepare(`
        INSERT INTO users (id, email, username, password_hash, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        user.id,
        user.email,
        user.username,
        hashedPassword,
        user.role,
        user.isActive ? 1 : 0,
        new Date().toISOString(),
        new Date().toISOString()
      );
    }
  });

  describe('ユーザー登録フロー', () => {
    it('Should register new user with valid credentials and create initial profile', async () => {
      const registrationData = {
        email: 'newuser@test.com',
        username: 'newuser',
        password: 'NewUserPass123!',
        confirmPassword: 'NewUserPass123!',
        role: 'player',
        acceptTerms: true,
        preferences: {
          emailNotifications: true,
          systemType: 'D&D 5e',
          experienceLevel: 'beginner'
        }
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(registrationData.email);
      expect(response.body.data.user.username).toBe(registrationData.username);
      expect(response.body.data.user.role).toBe(registrationData.role);
      
      // Should not return password
      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.user.passwordHash).toBeUndefined();
      
      // Should include JWT tokens
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      
      // Verify user was created in database
      const dbUser = db.prepare('SELECT * FROM users WHERE email = ?').get(registrationData.email);
      expect(dbUser).toBeDefined();
      expect(dbUser.username).toBe(registrationData.username);
      expect(dbUser.is_active).toBe(1);
      
      // Verify password was hashed
      const passwordMatch = await bcrypt.compare(registrationData.password, dbUser.password_hash);
      expect(passwordMatch).toBe(true);
      
      // Verify user profile was created
      const userProfile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(dbUser.id);
      expect(userProfile).toBeDefined();
      expect(JSON.parse(userProfile.preferences).emailNotifications).toBe(true);
    });

    it('Should reject registration with duplicate email or username', async () => {
      const duplicateEmailData = {
        email: testUsers[0].email,
        username: 'uniqueusername',
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!',
        role: 'player'
      };

      const emailResponse = await request(app)
        .post('/api/auth/register')
        .send(duplicateEmailData)
        .expect(409);

      expect(emailResponse.body.success).toBe(false);
      expect(emailResponse.body.error.code).toBe('DUPLICATE_EMAIL');
      expect(emailResponse.body.error.message).toContain('already exists');

      const duplicateUsernameData = {
        email: 'unique@test.com',
        username: testUsers[0].username,
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!',
        role: 'player'
      };

      const usernameResponse = await request(app)
        .post('/api/auth/register')
        .send(duplicateUsernameData)
        .expect(409);

      expect(usernameResponse.body.success).toBe(false);
      expect(usernameResponse.body.error.code).toBe('DUPLICATE_USERNAME');
    });

    it('Should validate password strength and confirm password match', async () => {
      const weakPasswordData = {
        email: 'weakpass@test.com',
        username: 'weakpassuser',
        password: '123',
        confirmPassword: '123',
        role: 'player'
      };

      const weakResponse = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordData)
        .expect(400);

      expect(weakResponse.body.error.code).toBe('VALIDATION_ERROR');
      expect(weakResponse.body.error.details).toContain('password strength');

      const mismatchData = {
        email: 'mismatch@test.com',
        username: 'mismatchuser',
        password: 'ValidPass123!',
        confirmPassword: 'DifferentPass456!',
        role: 'player'
      };

      const mismatchResponse = await request(app)
        .post('/api/auth/register')
        .send(mismatchData)
        .expect(400);

      expect(mismatchResponse.body.error.code).toBe('VALIDATION_ERROR');
      expect(mismatchResponse.body.error.details).toContain('passwords do not match');
    });
  });

  describe('ログインとトークン管理', () => {
    it('Should authenticate user with valid credentials and return JWT tokens', async () => {
      const loginData = {
        email: testUsers[0].email,
        password: testUsers[0].password,
        rememberMe: true
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(testUsers[0].email);
      expect(response.body.data.user.role).toBe(testUsers[0].role);
      
      // Should include JWT tokens
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      
      // Verify JWT tokens are valid
      const accessTokenPayload = jwt.verify(response.body.data.accessToken, jwtSecret) as any;
      expect(accessTokenPayload.userId).toBe(testUsers[0].id);
      expect(accessTokenPayload.email).toBe(testUsers[0].email);
      expect(accessTokenPayload.role).toBe(testUsers[0].role);
      
      const refreshTokenPayload = jwt.verify(response.body.data.refreshToken, jwtSecret) as any;
      expect(refreshTokenPayload.userId).toBe(testUsers[0].id);
      expect(refreshTokenPayload.type).toBe('refresh');
      
      // Verify session was created in database
      const session = db.prepare('SELECT * FROM user_sessions WHERE user_id = ?').get(testUsers[0].id);
      expect(session).toBeDefined();
      expect(session.is_active).toBe(1);
      expect(session.refresh_token_hash).toBeDefined();
    });

    it('Should reject login with invalid credentials', async () => {
      const invalidPasswordData = {
        email: testUsers[0].email,
        password: 'WrongPassword123!'
      };

      const passwordResponse = await request(app)
        .post('/api/auth/login')
        .send(invalidPasswordData)
        .expect(401);

      expect(passwordResponse.body.success).toBe(false);
      expect(passwordResponse.body.error.code).toBe('INVALID_CREDENTIALS');

      const invalidEmailData = {
        email: 'nonexistent@test.com',
        password: testUsers[0].password
      };

      const emailResponse = await request(app)
        .post('/api/auth/login')
        .send(invalidEmailData)
        .expect(401);

      expect(emailResponse.body.success).toBe(false);
      expect(emailResponse.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('Should reject login for suspended/inactive users', async () => {
      const suspendedUserData = {
        email: testUsers[3].email,
        password: testUsers[3].password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(suspendedUserData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCOUNT_SUSPENDED');
      expect(response.body.error.message).toContain('suspended');
    });

    it('Should implement rate limiting for login attempts', async () => {
      const loginData = {
        email: testUsers[0].email,
        password: 'WrongPassword123!'
      };

      // Make multiple failed login attempts
      const attempts = Array.from({ length: 6 }, () =>
        request(app)
          .post('/api/auth/login')
          .send(loginData)
      );

      const responses = await Promise.allSettled(attempts);

      // First few attempts should return 401 (invalid credentials)
      const firstResponses = responses.slice(0, 5);
      firstResponses.forEach(response => {
        if (response.status === 'fulfilled') {
          expect(response.value.status).toBe(401);
        }
      });

      // Last attempt should be rate limited
      const lastResponse = responses[5];
      if (lastResponse.status === 'fulfilled') {
        expect(lastResponse.value.status).toBe(429);
        expect(lastResponse.value.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      }

      // Verify rate limiting record in database
      const rateLimitRecord = db.prepare(`
        SELECT * FROM rate_limits 
        WHERE identifier = ? AND action = 'login'
      `).get(testUsers[0].email);

      expect(rateLimitRecord).toBeDefined();
      expect(rateLimitRecord.attempt_count).toBeGreaterThanOrEqual(5);
    });
  });

  describe('トークンリフレッシュとセッション管理', () => {
    let validTokens: { accessToken: string; refreshToken: string };

    beforeEach(async () => {
      // Get valid tokens
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers[0].email,
          password: testUsers[0].password
        })
        .expect(200);

      validTokens = {
        accessToken: loginResponse.body.data.accessToken,
        refreshToken: loginResponse.body.data.refreshToken
      };
    });

    it('Should refresh access token with valid refresh token', async () => {
      const refreshData = {
        refreshToken: validTokens.refreshToken
      };

      const response = await request(app)
        .post('/api/auth/refresh')
        .send(refreshData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      
      // New tokens should be different from old ones
      expect(response.body.data.accessToken).not.toBe(validTokens.accessToken);
      expect(response.body.data.refreshToken).not.toBe(validTokens.refreshToken);
      
      // Verify new tokens are valid
      const newAccessTokenPayload = jwt.verify(response.body.data.accessToken, jwtSecret) as any;
      expect(newAccessTokenPayload.userId).toBe(testUsers[0].id);
      
      // Verify old refresh token is invalidated
      const oldSession = db.prepare(`
        SELECT * FROM user_sessions 
        WHERE user_id = ? AND refresh_token_hash = ?
      `).get(testUsers[0].id, hashToken(validTokens.refreshToken));

      expect(oldSession.is_active).toBe(0);

      // Verify new session is created
      const newSession = db.prepare(`
        SELECT * FROM user_sessions 
        WHERE user_id = ? AND is_active = 1
      `).get(testUsers[0].id);

      expect(newSession).toBeDefined();
      expect(newSession.refresh_token_hash).not.toBe(hashToken(validTokens.refreshToken));
    });

    it('Should reject refresh with invalid or expired refresh token', async () => {
      const invalidRefreshData = {
        refreshToken: 'invalid.refresh.token'
      };

      const invalidResponse = await request(app)
        .post('/api/auth/refresh')
        .send(invalidRefreshData)
        .expect(401);

      expect(invalidResponse.body.error.code).toBe('INVALID_REFRESH_TOKEN');

      // Create expired token
      const expiredToken = jwt.sign(
        { userId: testUsers[0].id, type: 'refresh' },
        jwtSecret,
        { expiresIn: '-1h' } // Already expired
      );

      const expiredRefreshData = {
        refreshToken: expiredToken
      };

      const expiredResponse = await request(app)
        .post('/api/auth/refresh')
        .send(expiredRefreshData)
        .expect(401);

      expect(expiredResponse.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('Should handle concurrent token refresh requests safely', async () => {
      // Make multiple concurrent refresh requests
      const concurrentRequests = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: validTokens.refreshToken })
      );

      const responses = await Promise.allSettled(concurrentRequests);

      // Only one should succeed, others should fail due to token already being used
      const successfulResponses = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );
      const failedResponses = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status !== 200
      );

      expect(successfulResponses).toHaveLength(1);
      expect(failedResponses.length).toBeGreaterThan(0);

      // Failed responses should indicate token already used
      failedResponses.forEach(response => {
        if (response.status === 'fulfilled') {
          expect(response.value.body.error.code).toBe('TOKEN_ALREADY_USED');
        }
      });
    });

    it('Should track and manage multiple active sessions per user', async () => {
      // Create multiple sessions by logging in from different "devices"
      const loginResponses = await Promise.all([
        request(app)
          .post('/api/auth/login')
          .send({
            email: testUsers[0].email,
            password: testUsers[0].password,
            deviceInfo: { type: 'web', browser: 'chrome' }
          }),
        request(app)
          .post('/api/auth/login')
          .send({
            email: testUsers[0].email,
            password: testUsers[0].password,
            deviceInfo: { type: 'mobile', browser: 'safari' }
          }),
        request(app)
          .post('/api/auth/login')
          .send({
            email: testUsers[0].email,
            password: testUsers[0].password,
            deviceInfo: { type: 'desktop', browser: 'firefox' }
          })
      ]);

      // All logins should succeed
      loginResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Verify multiple active sessions in database
      const activeSessions = db.prepare(`
        SELECT * FROM user_sessions 
        WHERE user_id = ? AND is_active = 1
      `).all(testUsers[0].id);

      expect(activeSessions).toHaveLength(4); // 3 new + 1 from beforeEach

      // Get session list via API
      const sessionsResponse = await request(app)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${loginResponses[0].body.data.accessToken}`)
        .expect(200);

      expect(sessionsResponse.body.data.sessions).toHaveLength(4);
      expect(sessionsResponse.body.data.sessions.every((s: any) => s.isActive)).toBe(true);
    });
  });

  describe('セッション管理と認証保護', () => {
    let userTokens: { accessToken: string; refreshToken: string };
    let gmTokens: { accessToken: string; refreshToken: string };

    beforeEach(async () => {
      // Login as regular user
      const userLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers[1].email,
          password: testUsers[1].password
        });
      userTokens = userLogin.body.data;

      // Login as GM
      const gmLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers[0].email,
          password: testUsers[0].password
        });
      gmTokens = gmLogin.body.data;
    });

    it('Should protect routes with valid authentication tokens', async () => {
      // Create test campaign
      const campaign = TestDataFactory.createTestCampaign();

      // Access protected route with valid token
      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${gmTokens.accessToken}`)
        .send(campaign)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      // Access same route without token should fail
      const unauthorizedResponse = await request(app)
        .post('/api/campaigns')
        .send(campaign)
        .expect(401);

      expect(unauthorizedResponse.body.error.code).toBe('MISSING_TOKEN');

      // Access with invalid token should fail
      const invalidTokenResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', 'Bearer invalid.token.here')
        .send(campaign)
        .expect(401);

      expect(invalidTokenResponse.body.error.code).toBe('INVALID_TOKEN');
    });

    it('Should enforce role-based access control', async () => {
      // Create campaign as GM (should succeed)
      const campaign = TestDataFactory.createTestCampaign();

      const gmCreateResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${gmTokens.accessToken}`)
        .send(campaign)
        .expect(201);

      expect(gmCreateResponse.body.success).toBe(true);
      const campaignId = gmCreateResponse.body.data.id;

      // Try to delete campaign as regular player (should fail)
      const playerDeleteResponse = await request(app)
        .delete(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .expect(403);

      expect(playerDeleteResponse.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');

      // Delete as GM (should succeed)
      const gmDeleteResponse = await request(app)
        .delete(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${gmTokens.accessToken}`)
        .expect(200);

      expect(gmDeleteResponse.body.success).toBe(true);
    });

    it('Should handle session timeout and automatic logout', async () => {
      // Create short-lived token for testing
      const shortLivedToken = jwt.sign(
        { 
          userId: testUsers[1].id,
          email: testUsers[1].email,
          role: testUsers[1].role,
          sessionId: 'test-session'
        },
        jwtSecret,
        { expiresIn: '1s' }
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try to access protected route with expired token
      const response = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${shortLivedToken}`)
        .expect(401);

      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
      expect(response.body.error.message).toContain('expired');
    });

    it('Should invalidate all sessions on security event', async () => {
      // Create multiple sessions
      const sessions = await Promise.all([
        request(app)
          .post('/api/auth/login')
          .send({
            email: testUsers[0].email,
            password: testUsers[0].password,
            deviceInfo: { type: 'web' }
          }),
        request(app)
          .post('/api/auth/login')
          .send({
            email: testUsers[0].email,
            password: testUsers[0].password,
            deviceInfo: { type: 'mobile' }
          })
      ]);

      // Verify sessions are active
      const activeBefore = db.prepare(`
        SELECT COUNT(*) as count FROM user_sessions 
        WHERE user_id = ? AND is_active = 1
      `).get(testUsers[0].id) as { count: number };

      expect(activeBefore.count).toBeGreaterThan(0);

      // Trigger security event (e.g., suspicious activity)
      const securityEventResponse = await request(app)
        .post('/api/auth/security-event')
        .set('Authorization', `Bearer ${sessions[0].body.data.accessToken}`)
        .send({
          eventType: 'suspicious_activity',
          reason: 'Multiple failed login attempts from different locations',
          invalidateAllSessions: true
        })
        .expect(200);

      expect(securityEventResponse.body.success).toBe(true);

      // Verify all sessions are invalidated
      const activeAfter = db.prepare(`
        SELECT COUNT(*) as count FROM user_sessions 
        WHERE user_id = ? AND is_active = 1
      `).get(testUsers[0].id) as { count: number };

      expect(activeAfter.count).toBe(0);

      // Verify tokens no longer work
      const testResponse = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${sessions[0].body.data.accessToken}`)
        .expect(401);

      expect(testResponse.body.error.code).toBe('SESSION_INVALIDATED');
    });
  });

  describe('パスワードリセットと2FA', () => {
    it('Should handle password reset flow with email verification', async () => {
      const resetRequestData = {
        email: testUsers[1].email
      };

      // Request password reset
      const resetResponse = await request(app)
        .post('/api/auth/password-reset-request')
        .send(resetRequestData)
        .expect(200);

      expect(resetResponse.body.success).toBe(true);
      expect(resetResponse.body.message).toContain('reset link');

      // Verify reset token was created in database
      const resetToken = db.prepare(`
        SELECT * FROM password_reset_tokens 
        WHERE user_id = ? AND is_used = 0
      `).get(testUsers[1].id);

      expect(resetToken).toBeDefined();
      expect(resetToken.expires_at).toBeDefined();

      // Use reset token to change password
      const newPasswordData = {
        token: resetToken.token,
        newPassword: 'NewSecurePassword123!',
        confirmPassword: 'NewSecurePassword123!'
      };

      const resetCompleteResponse = await request(app)
        .post('/api/auth/password-reset')
        .send(newPasswordData)
        .expect(200);

      expect(resetCompleteResponse.body.success).toBe(true);

      // Verify old password no longer works
      const oldPasswordLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers[1].email,
          password: testUsers[1].password
        })
        .expect(401);

      expect(oldPasswordLogin.body.error.code).toBe('INVALID_CREDENTIALS');

      // Verify new password works
      const newPasswordLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers[1].email,
          password: newPasswordData.newPassword
        })
        .expect(200);

      expect(newPasswordLogin.body.success).toBe(true);

      // Verify reset token is marked as used
      const usedToken = db.prepare(`
        SELECT * FROM password_reset_tokens 
        WHERE token = ?
      `).get(resetToken.token);

      expect(usedToken.is_used).toBe(1);
    });

    it('Should setup and verify two-factor authentication', async () => {
      // Login first
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers[0].email,
          password: testUsers[0].password
        });

      const accessToken = loginResponse.body.data.accessToken;

      // Setup 2FA
      const setupResponse = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(setupResponse.body.success).toBe(true);
      expect(setupResponse.body.data.qrCode).toBeDefined();
      expect(setupResponse.body.data.secret).toBeDefined();
      expect(setupResponse.body.data.backupCodes).toBeDefined();

      // Verify 2FA with test code (mocked TOTP)
      const verifyResponse = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          code: '123456', // Mock TOTP code
          secret: setupResponse.body.data.secret
        })
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);

      // Verify 2FA is enabled in database
      const user2FA = db.prepare(`
        SELECT * FROM user_2fa WHERE user_id = ?
      `).get(testUsers[0].id);

      expect(user2FA).toBeDefined();
      expect(user2FA.is_enabled).toBe(1);
      expect(user2FA.secret_key).toBeDefined();

      // Now login should require 2FA
      const loginWith2FA = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers[0].email,
          password: testUsers[0].password
        })
        .expect(200);

      expect(loginWith2FA.body.data.requires2FA).toBe(true);
      expect(loginWith2FA.body.data.tempToken).toBeDefined();

      // Complete login with 2FA code
      const complete2FALogin = await request(app)
        .post('/api/auth/2fa/login')
        .send({
          tempToken: loginWith2FA.body.data.tempToken,
          code: '123456'
        })
        .expect(200);

      expect(complete2FALogin.body.success).toBe(true);
      expect(complete2FALogin.body.data.accessToken).toBeDefined();
      expect(complete2FALogin.body.data.refreshToken).toBeDefined();
    });
  });

  describe('セキュリティ監査とログ', () => {
    it('Should log all authentication events for security audit', async () => {
      // Perform various auth operations
      await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers[0].email,
          password: testUsers[0].password
        });

      await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers[0].email,
          password: 'WrongPassword'
        });

      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'audit@test.com',
          username: 'audituser',
          password: 'AuditPass123!',
          confirmPassword: 'AuditPass123!',
          role: 'player'
        });

      // Check audit logs
      const auditLogs = db.prepare(`
        SELECT * FROM audit_logs 
        WHERE event_type LIKE 'auth_%'
        ORDER BY created_at DESC
      `).all();

      expect(auditLogs.length).toBeGreaterThanOrEqual(3);

      // Verify log entries
      const loginSuccess = auditLogs.find(log => 
        log.event_type === 'auth_login_success' && 
        JSON.parse(log.event_data).email === testUsers[0].email
      );
      expect(loginSuccess).toBeDefined();

      const loginFailure = auditLogs.find(log => 
        log.event_type === 'auth_login_failure'
      );
      expect(loginFailure).toBeDefined();

      const registration = auditLogs.find(log => 
        log.event_type === 'auth_registration'
      );
      expect(registration).toBeDefined();

      // Verify sensitive data is not logged
      auditLogs.forEach(log => {
        const eventData = JSON.parse(log.event_data);
        expect(eventData.password).toBeUndefined();
        expect(eventData.passwordHash).toBeUndefined();
      });
    });

    it('Should detect and respond to suspicious authentication patterns', async () => {
      // Simulate brute force attack
      const bruteForceAttempts = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: testUsers[0].email,
            password: 'WrongPassword' + Math.random()
          })
      );

      await Promise.allSettled(bruteForceAttempts);

      // Check for security alert
      const securityAlerts = db.prepare(`
        SELECT * FROM security_alerts 
        WHERE alert_type = 'brute_force_attempt'
        AND target_identifier = ?
      `).all(testUsers[0].email);

      expect(securityAlerts.length).toBeGreaterThan(0);

      const alert = securityAlerts[0];
      expect(alert.severity).toBe('high');
      expect(alert.is_resolved).toBe(0);

      // Verify account is temporarily locked
      const lockoutRecord = db.prepare(`
        SELECT * FROM account_lockouts 
        WHERE user_id = ? AND is_active = 1
      `).get(testUsers[0].id);

      expect(lockoutRecord).toBeDefined();
      expect(new Date(lockoutRecord.locked_until)).toBeInstanceOf(Date);

      // Verify login is blocked during lockout
      const lockedLoginAttempt = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers[0].email,
          password: testUsers[0].password
        })
        .expect(423);

      expect(lockedLoginAttempt.body.error.code).toBe('ACCOUNT_LOCKED');
    });
  });
});

// Helper functions
function setupAuthTables(db: DatabaseType): void {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'player',
      is_active BOOLEAN DEFAULT 1,
      email_verified BOOLEAN DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // User profiles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      preferences TEXT,
      avatar_url TEXT,
      bio TEXT,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // User sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      refresh_token_hash TEXT NOT NULL,
      device_info TEXT,
      ip_address TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Password reset tokens table
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL,
      is_used BOOLEAN DEFAULT 0,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Two-factor authentication table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_2fa (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      secret_key TEXT NOT NULL,
      backup_codes TEXT,
      is_enabled BOOLEAN DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Rate limiting table
  db.exec(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      action TEXT NOT NULL,
      attempt_count INTEGER DEFAULT 0,
      first_attempt TEXT NOT NULL,
      last_attempt TEXT NOT NULL,
      blocked_until TEXT
    )
  `);

  // Audit logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      event_type TEXT NOT NULL,
      event_data TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL
    )
  `);

  // Security alerts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS security_alerts (
      id TEXT PRIMARY KEY,
      alert_type TEXT NOT NULL,
      target_identifier TEXT,
      severity TEXT NOT NULL,
      description TEXT,
      is_resolved BOOLEAN DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  // Account lockouts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS account_lockouts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      locked_until TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);
}

function hashToken(token: string): string {
  // Simple hash for testing - in production use proper crypto
  return Buffer.from(token).toString('base64');
}