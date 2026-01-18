/**
 * 認証サービス
 *
 * JWT認証とユーザー管理を提供
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { ApiResponse } from '../types/index.js';

// ========================================
// 型定義
// ========================================

export type UserRole = 'admin' | 'user' | 'viewer';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
}

export interface AuthConfig {
  jwtSecret: string;
  jwtRefreshSecret: string;
  accessTokenExpiry: string;  // e.g., '15m', '1h'
  refreshTokenExpiry: string; // e.g., '7d', '30d'
  saltRounds: number;
}

// ========================================
// 認証サービスクラス
// ========================================

export class AuthService {
  private users: Map<string, User> = new Map();
  private emailIndex: Map<string, string> = new Map(); // email -> userId
  private refreshTokens: Set<string> = new Set();
  private config: AuthConfig;

  constructor(config: Partial<AuthConfig> = {}) {
    this.config = {
      jwtSecret: config.jwtSecret || process.env.JWT_SECRET || 'default-secret-change-in-production',
      jwtRefreshSecret: config.jwtRefreshSecret || process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
      accessTokenExpiry: config.accessTokenExpiry || '15m',
      refreshTokenExpiry: config.refreshTokenExpiry || '7d',
      saltRounds: config.saltRounds || 10,
    };
  }

  /**
   * ユーザー登録
   */
  async register(
    email: string,
    password: string,
    name: string,
    role: UserRole = 'user'
  ): Promise<ApiResponse<UserPublic>> {
    // メールアドレスの重複チェック
    if (this.emailIndex.has(email.toLowerCase())) {
      return {
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'このメールアドレスは既に登録されています',
        },
      };
    }

    // パスワードバリデーション
    if (password.length < 8) {
      return {
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'パスワードは8文字以上必要です',
        },
      };
    }

    // パスワードハッシュ化
    const passwordHash = await bcrypt.hash(password, this.config.saltRounds);

    // ユーザー作成
    const userId = this.generateId();
    const now = new Date();
    const user: User = {
      id: userId,
      email: email.toLowerCase(),
      passwordHash,
      name,
      role,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(userId, user);
    this.emailIndex.set(email.toLowerCase(), userId);

    return {
      success: true,
      data: this.toPublicUser(user),
    };
  }

  /**
   * ログイン
   */
  async login(
    email: string,
    password: string
  ): Promise<ApiResponse<{ user: UserPublic; tokens: AuthTokens }>> {
    const userId = this.emailIndex.get(email.toLowerCase());
    if (!userId) {
      return {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'メールアドレスまたはパスワードが正しくありません',
        },
      };
    }

    const user = this.users.get(userId);
    if (!user) {
      return {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'ユーザーが見つかりません',
        },
      };
    }

    // パスワード検証
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'メールアドレスまたはパスワードが正しくありません',
        },
      };
    }

    // トークン生成
    const tokens = this.generateTokens(user);

    return {
      success: true,
      data: {
        user: this.toPublicUser(user),
        tokens,
      },
    };
  }

  /**
   * ログアウト
   */
  logout(refreshToken: string): ApiResponse<void> {
    this.refreshTokens.delete(refreshToken);
    return { success: true };
  }

  /**
   * トークン更新
   */
  async refreshAccessToken(
    refreshToken: string
  ): Promise<ApiResponse<AuthTokens>> {
    // リフレッシュトークン検証
    if (!this.refreshTokens.has(refreshToken)) {
      return {
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'リフレッシュトークンが無効です',
        },
      };
    }

    try {
      const payload = jwt.verify(
        refreshToken,
        this.config.jwtRefreshSecret
      ) as JWTPayload;

      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      const user = this.users.get(payload.userId);
      if (!user) {
        this.refreshTokens.delete(refreshToken);
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'ユーザーが見つかりません',
          },
        };
      }

      // 古いリフレッシュトークンを削除
      this.refreshTokens.delete(refreshToken);

      // 新しいトークンペアを生成
      const tokens = this.generateTokens(user);

      return {
        success: true,
        data: tokens,
      };
    } catch {
      this.refreshTokens.delete(refreshToken);
      return {
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'リフレッシュトークンが無効または期限切れです',
        },
      };
    }
  }

  /**
   * アクセストークン検証
   */
  verifyAccessToken(accessToken: string): ApiResponse<JWTPayload> {
    try {
      const payload = jwt.verify(
        accessToken,
        this.config.jwtSecret
      ) as JWTPayload;

      if (payload.type !== 'access') {
        return {
          success: false,
          error: {
            code: 'INVALID_TOKEN_TYPE',
            message: 'トークンタイプが不正です',
          },
        };
      }

      return {
        success: true,
        data: payload,
      };
    } catch {
      return {
        success: false,
        error: {
          code: 'INVALID_ACCESS_TOKEN',
          message: 'アクセストークンが無効または期限切れです',
        },
      };
    }
  }

  /**
   * ユーザー取得
   */
  getUser(userId: string): ApiResponse<UserPublic> {
    const user = this.users.get(userId);
    if (!user) {
      return {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'ユーザーが見つかりません',
        },
      };
    }

    return {
      success: true,
      data: this.toPublicUser(user),
    };
  }

  /**
   * ユーザー一覧取得
   */
  listUsers(): ApiResponse<UserPublic[]> {
    const users = Array.from(this.users.values()).map(this.toPublicUser);
    return {
      success: true,
      data: users,
    };
  }

  /**
   * パスワード変更
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<ApiResponse<void>> {
    const user = this.users.get(userId);
    if (!user) {
      return {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'ユーザーが見つかりません',
        },
      };
    }

    // 現在のパスワード検証
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return {
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: '現在のパスワードが正しくありません',
        },
      };
    }

    // 新しいパスワードのバリデーション
    if (newPassword.length < 8) {
      return {
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'パスワードは8文字以上必要です',
        },
      };
    }

    // パスワード更新
    user.passwordHash = await bcrypt.hash(newPassword, this.config.saltRounds);
    user.updatedAt = new Date();

    return { success: true };
  }

  /**
   * ユーザーロール変更（管理者のみ）
   */
  changeUserRole(
    requesterId: string,
    targetUserId: string,
    newRole: UserRole
  ): ApiResponse<UserPublic> {
    const requester = this.users.get(requesterId);
    if (!requester || requester.role !== 'admin') {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '権限がありません',
        },
      };
    }

    const targetUser = this.users.get(targetUserId);
    if (!targetUser) {
      return {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'ユーザーが見つかりません',
        },
      };
    }

    targetUser.role = newRole;
    targetUser.updatedAt = new Date();

    return {
      success: true,
      data: this.toPublicUser(targetUser),
    };
  }

  /**
   * ユーザー削除
   */
  deleteUser(requesterId: string, targetUserId: string): ApiResponse<void> {
    const requester = this.users.get(requesterId);
    if (!requester || requester.role !== 'admin') {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '権限がありません',
        },
      };
    }

    const targetUser = this.users.get(targetUserId);
    if (!targetUser) {
      return {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'ユーザーが見つかりません',
        },
      };
    }

    // 自分自身は削除不可
    if (requesterId === targetUserId) {
      return {
        success: false,
        error: {
          code: 'CANNOT_DELETE_SELF',
          message: '自分自身を削除することはできません',
        },
      };
    }

    this.users.delete(targetUserId);
    this.emailIndex.delete(targetUser.email);

    return { success: true };
  }

  /**
   * 権限チェック
   */
  hasPermission(
    userId: string,
    requiredRole: UserRole | UserRole[]
  ): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    const roles: UserRole[] = Array.isArray(requiredRole)
      ? requiredRole
      : [requiredRole];

    // admin はすべての権限を持つ
    if (user.role === 'admin') return true;

    return roles.includes(user.role);
  }

  // ========================================
  // プライベートメソッド
  // ========================================

  private generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTokens(user: User): AuthTokens {
    const accessPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };

    const refreshPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'refresh',
    };

    const accessToken = jwt.sign(accessPayload, this.config.jwtSecret, {
      expiresIn: this.parseExpiry(this.config.accessTokenExpiry),
    });

    const refreshToken = jwt.sign(
      refreshPayload,
      this.config.jwtRefreshSecret,
      { expiresIn: this.parseExpiry(this.config.refreshTokenExpiry) }
    );

    // リフレッシュトークンを保存
    this.refreshTokens.add(refreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiry(this.config.accessTokenExpiry),
    };
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }

  private toPublicUser(user: User): UserPublic {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

/**
 * AuthServiceのファクトリ関数
 */
export function createAuthService(config?: Partial<AuthConfig>): AuthService {
  return new AuthService(config);
}

/**
 * 認証ミドルウェア用のヘルパー
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}
