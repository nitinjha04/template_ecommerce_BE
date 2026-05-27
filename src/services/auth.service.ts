import crypto from 'crypto';
import { User } from '../models';
import { ApiError } from '../utils/ApiError';
import { signToken } from '../utils/jwt';
import { env, isEmailEnabled } from '../config/env';
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

const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_VERIFIED_TTL_MS = 15 * 60 * 1000;

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

const generateOtp = () => String(crypto.randomInt(100000, 1000000));

const normalizeEmail = (email: string) => email.toLowerCase().trim();

const isEmailVerified = (user: InstanceType<typeof User>) =>
  user.role === 'admin' || user.emailVerified !== false;

const assignSignupOtp = async (user: InstanceType<typeof User>) => {
  const otp = generateOtp();
  user.signupOtpHash = hashToken(otp);
  user.signupOtpExpires = new Date(Date.now() + OTP_TTL_MS);
  await user.save({ validateBeforeSave: false });
  await EmailService.sendSignupOtp(user.email, user.name, otp);

  if (!isEmailEnabled() && env.nodeEnv === 'development') {
    console.log(`[dev] Signup OTP for ${user.email}:`, otp);
  }
};

const assignResetOtp = async (user: InstanceType<typeof User>) => {
  const otp = generateOtp();
  user.resetOtpHash = hashToken(otp);
  user.resetOtpExpires = new Date(Date.now() + OTP_TTL_MS);
  user.resetOtpVerifiedAt = undefined;
  await user.save({ validateBeforeSave: false });
  await EmailService.sendPasswordResetOtp(user.email, user.name, otp);

  if (!isEmailEnabled() && env.nodeEnv === 'development') {
    console.log(`[dev] Password reset OTP for ${user.email}:`, otp);
  }
};

export class AuthService {
  static async signup(input: SignupInput) {
    const email = normalizeEmail(input.email);
    const existing = await User.findOne({ email }).select(
      '+signupOtpHash +signupOtpExpires'
    );

    // If user is already onboarded/verified, block re-signup.
    // If onboarding is incomplete (state 0), allow updating password + resending OTP.
    if (existing && (existing.onBoardState ?? 0) > 0) {
      throw new ApiError(409, 'Email is already registered');
    }

    let user = existing;

    if (user) {
      user.name = input.name.trim();
      user.password = input.password;
      user.emailVerified = false;
      user.onBoardState = 0;
      user.role = user.role || 'customer';
      await user.save();
    } else {
      user = await User.create({
        name: input.name.trim(),
        email,
        password: input.password,
        role: 'customer',
        emailVerified: false,
        onBoardState: 0,
      });
    }

    await assignSignupOtp(user);

    return {
      message: 'Verification code sent to your email.',
      email: user.email,
    };
  }

  static async verifySignupOtp(email: string, otp: string) {
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail }).select(
      '+signupOtpHash +signupOtpExpires'
    );

    if (!user) {
      throw new ApiError(400, 'Invalid or expired verification code');
    }

    if (user.emailVerified) {
      throw new ApiError(400, 'Email is already verified. Please sign in.');
    }

    if (!user.signupOtpHash || !user.signupOtpExpires) {
      throw new ApiError(400, 'Invalid or expired verification code');
    }

    if (user.signupOtpExpires.getTime() < Date.now()) {
      throw new ApiError(400, 'Verification code has expired');
    }

    if (hashToken(otp.trim()) !== user.signupOtpHash) {
      throw new ApiError(400, 'Invalid verification code');
    }

    user.emailVerified = true;
    user.onBoardState = 1;
    user.signupOtpHash = undefined;
    user.signupOtpExpires = undefined;
    await user.save({ validateBeforeSave: false });

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return formatAuthResponse(user, token);
  }

  static async resendSignupOtp(email: string) {
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    const message = 'If an account exists, a verification code has been sent.';

    if (!user || user.emailVerified || (user.onBoardState ?? 0) > 0) {
      return { message };
    }

    await assignSignupOtp(user);
    return { message, email: user.email };
  }

  static async login(input: LoginInput) {
    const user = await User.findOne({ email: normalizeEmail(input.email) }).select(
      '+password'
    );
    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const isMatch = await user.comparePassword(input.password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (!isEmailVerified(user)) {
      throw new ApiError(
        403,
        'Please verify your email before signing in. Check your inbox for the code.'
      );
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
    const user = await User.findOne({ email: normalizeEmail(email) });
    const message =
      'If that email exists, a verification code has been sent.';

    if (!user) {
      return { message };
    }

    await assignResetOtp(user);
    return { message, email: user.email };
  }

  static async verifyForgotPasswordOtp(email: string, otp: string) {
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail }).select(
      '+resetOtpHash +resetOtpExpires'
    );

    if (!user?.resetOtpHash || !user.resetOtpExpires) {
      throw new ApiError(400, 'Invalid or expired verification code');
    }

    if (user.resetOtpExpires.getTime() < Date.now()) {
      throw new ApiError(400, 'Verification code has expired');
    }

    if (hashToken(otp.trim()) !== user.resetOtpHash) {
      throw new ApiError(400, 'Invalid verification code');
    }

    user.resetOtpHash = undefined;
    user.resetOtpExpires = undefined;
    user.resetOtpVerifiedAt = new Date();
    await user.save({ validateBeforeSave: false });

    return { message: 'Code verified. You can set a new password.', email: user.email };
  }

  static async resetPassword(email: string, password: string) {
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail }).select(
      '+password +resetOtpVerifiedAt'
    );

    if (!user?.resetOtpVerifiedAt) {
      throw new ApiError(400, 'Please verify your email code first');
    }

    if (user.resetOtpVerifiedAt.getTime() < Date.now() - RESET_VERIFIED_TTL_MS) {
      throw new ApiError(400, 'Verification expired. Please request a new code.');
    }

    user.password = password;
    user.resetOtpVerifiedAt = undefined;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return { message: 'Password updated successfully' };
  }
}
