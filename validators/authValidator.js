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

module.exports = {
  registerSchema,
};
