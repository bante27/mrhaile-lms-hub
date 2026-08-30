const { z } = require('zod');

const registerSchema = z.object({
  body: z.object({
    firstName: z
      .string()
      .min(1, 'First name is required')
      .regex(/^[A-Za-z]+$/, 'First name must contain letters only'),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .regex(/^[A-Za-z]+$/, 'Last name must contain letters only'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please provide a valid email address'),
    phone: z
      .string()
      .min(1, 'Phone number is required')
      .regex(/^\+?[0-9]{10,15}$/, 'Please provide a valid phone number'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
  }),
});

const verifyOtpSchema = z.object({
  body: z.object({
    email: z.string().min(1, 'Email is required').email('Please provide a valid email address'),
    otp: z.string().min(6, 'OTP must be 6 digits').max(6, 'OTP must be 6 digits'),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().min(1, 'Email is required').email('Please provide a valid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().min(1, 'Email is required').email('Please provide a valid email address'),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().min(1, 'Email is required').email('Please provide a valid email address'),
    otp: z.string().min(6, 'OTP must be 6 digits').max(6, 'OTP must be 6 digits'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
  }),
});

const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().regex(/^[A-Za-z]+$/, 'First name must contain letters only').optional(),
    lastName: z.string().regex(/^[A-Za-z]+$/, 'Last name must contain letters only').optional(),
    phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Please provide a valid phone number').optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      )
      .optional(),
  }),
});

module.exports = {
  registerSchema,
  verifyOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
};
