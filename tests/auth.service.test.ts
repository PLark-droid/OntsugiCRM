/**
 * 認証サービスのテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AuthService,
  createAuthService,
  extractBearerToken,
} from '../src/services/auth.service.js';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = createAuthService({
      jwtSecret: 'test-secret',
      jwtRefreshSecret: 'test-refresh-secret',
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',
      saltRounds: 4, // テスト用に低く設定
    });
  });

  describe('register', () => {
    it('新規ユーザーを登録できる', async () => {
      const result = await authService.register(
        'test@example.com',
        'password123',
        'テストユーザー'
      );

      expect(result.success).toBe(true);
      expect(result.data?.email).toBe('test@example.com');
      expect(result.data?.name).toBe('テストユーザー');
      expect(result.data?.role).toBe('user');
    });

    it('同じメールアドレスでは登録できない', async () => {
      await authService.register('test@example.com', 'password123', 'User 1');
      const result = await authService.register(
        'test@example.com',
        'password456',
        'User 2'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EMAIL_EXISTS');
    });

    it('8文字未満のパスワードはエラー', async () => {
      const result = await authService.register(
        'test@example.com',
        'short',
        'User'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WEAK_PASSWORD');
    });

    it('管理者ロールで登録できる', async () => {
      const result = await authService.register(
        'admin@example.com',
        'password123',
        '管理者',
        'admin'
      );

      expect(result.success).toBe(true);
      expect(result.data?.role).toBe('admin');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await authService.register('test@example.com', 'password123', 'Test User');
    });

    it('正しい認証情報でログインできる', async () => {
      const result = await authService.login('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.data?.user.email).toBe('test@example.com');
      expect(result.data?.tokens.accessToken).toBeDefined();
      expect(result.data?.tokens.refreshToken).toBeDefined();
    });

    it('間違ったパスワードではログインできない', async () => {
      const result = await authService.login('test@example.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('存在しないユーザーではログインできない', async () => {
      const result = await authService.login('nonexistent@example.com', 'password');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('メールアドレスは大文字小文字を区別しない', async () => {
      const result = await authService.login('TEST@EXAMPLE.COM', 'password123');

      expect(result.success).toBe(true);
    });
  });

  describe('verifyAccessToken', () => {
    it('有効なアクセストークンを検証できる', async () => {
      await authService.register('test@example.com', 'password123', 'Test User');
      const loginResult = await authService.login('test@example.com', 'password123');

      const verifyResult = authService.verifyAccessToken(
        loginResult.data!.tokens.accessToken
      );

      expect(verifyResult.success).toBe(true);
      expect(verifyResult.data?.email).toBe('test@example.com');
      expect(verifyResult.data?.type).toBe('access');
    });

    it('無効なトークンはエラー', () => {
      const result = authService.verifyAccessToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_ACCESS_TOKEN');
    });
  });

  describe('refreshAccessToken', () => {
    it('リフレッシュトークンで新しいトークンを取得できる', async () => {
      await authService.register('test@example.com', 'password123', 'Test User');
      const loginResult = await authService.login('test@example.com', 'password123');

      const refreshResult = await authService.refreshAccessToken(
        loginResult.data!.tokens.refreshToken
      );

      expect(refreshResult.success).toBe(true);
      expect(refreshResult.data?.accessToken).toBeDefined();
      expect(refreshResult.data?.refreshToken).toBeDefined();
    });

    it('無効なリフレッシュトークンはエラー', async () => {
      const result = await authService.refreshAccessToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('logout', () => {
    it('ログアウトするとリフレッシュトークンが無効になる', async () => {
      await authService.register('test@example.com', 'password123', 'Test User');
      const loginResult = await authService.login('test@example.com', 'password123');
      const refreshToken = loginResult.data!.tokens.refreshToken;

      authService.logout(refreshToken);

      const refreshResult = await authService.refreshAccessToken(refreshToken);
      expect(refreshResult.success).toBe(false);
    });
  });

  describe('changePassword', () => {
    let userId: string;

    beforeEach(async () => {
      const result = await authService.register(
        'test@example.com',
        'password123',
        'Test User'
      );
      userId = result.data!.id;
    });

    it('パスワードを変更できる', async () => {
      const result = await authService.changePassword(
        userId,
        'password123',
        'newpassword456'
      );

      expect(result.success).toBe(true);

      // 新しいパスワードでログインできる
      const loginResult = await authService.login('test@example.com', 'newpassword456');
      expect(loginResult.success).toBe(true);
    });

    it('現在のパスワードが間違っているとエラー', async () => {
      const result = await authService.changePassword(
        userId,
        'wrongpassword',
        'newpassword456'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_PASSWORD');
    });
  });

  describe('changeUserRole', () => {
    let adminId: string;
    let userId: string;

    beforeEach(async () => {
      const adminResult = await authService.register(
        'admin@example.com',
        'password123',
        'Admin',
        'admin'
      );
      adminId = adminResult.data!.id;

      const userResult = await authService.register(
        'user@example.com',
        'password123',
        'User'
      );
      userId = userResult.data!.id;
    });

    it('管理者がユーザーロールを変更できる', () => {
      const result = authService.changeUserRole(adminId, userId, 'admin');

      expect(result.success).toBe(true);
      expect(result.data?.role).toBe('admin');
    });

    it('一般ユーザーはロールを変更できない', () => {
      const result = authService.changeUserRole(userId, adminId, 'user');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UNAUTHORIZED');
    });
  });

  describe('deleteUser', () => {
    let adminId: string;
    let userId: string;

    beforeEach(async () => {
      const adminResult = await authService.register(
        'admin@example.com',
        'password123',
        'Admin',
        'admin'
      );
      adminId = adminResult.data!.id;

      const userResult = await authService.register(
        'user@example.com',
        'password123',
        'User'
      );
      userId = userResult.data!.id;
    });

    it('管理者がユーザーを削除できる', () => {
      const result = authService.deleteUser(adminId, userId);

      expect(result.success).toBe(true);

      // 削除されたユーザーは取得できない
      const getResult = authService.getUser(userId);
      expect(getResult.success).toBe(false);
    });

    it('自分自身は削除できない', () => {
      const result = authService.deleteUser(adminId, adminId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CANNOT_DELETE_SELF');
    });
  });

  describe('hasPermission', () => {
    it('管理者はすべての権限を持つ', async () => {
      const result = await authService.register(
        'admin@example.com',
        'password123',
        'Admin',
        'admin'
      );

      expect(authService.hasPermission(result.data!.id, 'user')).toBe(true);
      expect(authService.hasPermission(result.data!.id, 'viewer')).toBe(true);
      expect(authService.hasPermission(result.data!.id, 'admin')).toBe(true);
    });

    it('一般ユーザーはユーザー権限のみ', async () => {
      const result = await authService.register(
        'user@example.com',
        'password123',
        'User',
        'user'
      );

      expect(authService.hasPermission(result.data!.id, 'user')).toBe(true);
      expect(authService.hasPermission(result.data!.id, 'admin')).toBe(false);
    });
  });

  describe('extractBearerToken', () => {
    it('Bearerトークンを抽出できる', () => {
      const token = extractBearerToken('Bearer abc123');
      expect(token).toBe('abc123');
    });

    it('Bearer以外の形式はnull', () => {
      expect(extractBearerToken('Basic abc123')).toBe(null);
      expect(extractBearerToken('abc123')).toBe(null);
      expect(extractBearerToken('')).toBe(null);
      expect(extractBearerToken(undefined)).toBe(null);
    });
  });
});
