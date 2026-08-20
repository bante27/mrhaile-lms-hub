const axios = require('axios');

/**
 * Verify Google reCAPTCHA or hCaptcha token
 * @param {string} token - The CAPTCHA token from frontend
 * @returns {Promise<boolean>} - Returns true if valid, false otherwise
 */
const verifyCaptcha = async (token) => {
  if (!token) return false;

  const secretKey = process.env.CAPTCHA_SECRET_KEY;
  if (!secretKey || secretKey.trim() === '') {
    return true; // Bypass verification if secret key is not set
  }

  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`,
      {},
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { success, score } = response.data;

    // For reCAPTCHA v3, score can also be checked (e.g. score >= 0.5)
    // For reCAPTCHA v2 / hCaptcha, success is boolean true/false
    if (success === true) {
      if (score !== undefined && score < 0.5) {
        return false; // Low score for v3 bot detection
      }
      return true;
    }

    return false;
  } catch (error) {
    console.error('CAPTCHA verification error:', error.message);
    return false;
  }
};

module.exports = verifyCaptcha;
