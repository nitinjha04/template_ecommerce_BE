import crypto from 'crypto';
import { User } from '../models';
import { ApiError } from '../utils/ApiError';
import { signToken } from '../utils/jwt';
import { env } from '../config/env';
import { EmailService } from './email.service';
import type { AuthResponsePayload } from '../types/auth';

interface SignupInput {
  name: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

const formatAuthResponse = (
  user: InstanceType<typeof User>,
  token: string
): AuthResponsePayload => ({
  user: {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  },
  token,
});

const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

export class AuthService {
  static async signup(input: SignupInput) {
    const existing = await User.findOne({ email: input.email });
    if (existing) {
      throw new ApiError(409, 'Email is already registered');
    }

    const user = await User.create({
      name: input.name,
      email: input.email,
      password: input.password,
      role: 'customer',
    });

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return formatAuthResponse(user, token);
  }

  static async login(input: LoginInput) {
    const user = await User.findOne({ email: input.email }).select('+password');
    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const isMatch = await user.comparePassword(input.password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return formatAuthResponse(user, token);
  }

  static async loginAdmin(input: LoginInput) {
    const result = await this.login(input);
    if (result.user.role !== 'admin') {
      throw new ApiError(403, 'Admin access only');
    }
    return result;
  }

  static async getProfile(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  static async forgotPassword(email: string) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return { message: 'If that email exists, a reset link has been sent.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = hashToken(resetToken);
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${env.frontendUrl}/reset-password?token=${resetToken}`;

    await EmailService.sendPasswordResetEmail(user.email, user.name, resetUrl);

    if (env.nodeEnv === 'development') {
      console.log('[dev] Password reset link:', resetUrl);
    }

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  static async resetPassword(token: string, password: string) {
    const hashed = hashToken(token);
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+password +resetPasswordToken +resetPasswordExpires');

    if (!user) {
      throw new ApiError(400, 'Invalid or expired reset token');
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return { message: 'Password updated successfully' };
  }
}
