import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { RegisterInput, LoginInput } from '../schemas/auth.schema.js';
import type { User } from '@encrypted-chat/shared';

const prisma = new PrismaClient();

export class AuthService {
  async register(data: RegisterInput): Promise<Omit<User, 'password'>> {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === data.email) {
        throw new Error('Email already registered');
      }
      if (existingUser.username === data.username) {
        throw new Error('Username already taken');
      }
    }

    // Hash password
    const hashedPassword = await argon2.hash(data.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: hashedPassword,
        publicKey: data.publicKey,
      },
      select: {
        id: true,
        username: true,
        email: true,
        publicKey: true,
        createdAt: true,
      },
    });

    return user;
  }

  async login(
    data: LoginInput
  ): Promise<{ user: Omit<User, 'password'>; userId: string }> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await argon2.verify(user.password, data.password);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    return {
      userId: user.id,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        publicKey: user.publicKey,
        createdAt: user.createdAt,
      },
    };
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null
  ): Promise<void> {
    const hashedToken = refreshToken ? await argon2.hash(refreshToken) : null;

    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedToken },
    });
  }

  async validateRefreshToken(
    userId: string,
    refreshToken: string
  ): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { refreshToken: true },
    });

    if (!user || !user.refreshToken) {
      return false;
    }

    return argon2.verify(user.refreshToken, refreshToken);
  }

  async getUserById(userId: string): Promise<Omit<User, 'password'> | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        publicKey: true,
        createdAt: true,
      },
    });

    return user;
  }
}
