// Chapa payment gateway integration config
const axios = require('axios');

const chapaConfig = {
  secretKey: process.env.CHAPA_SECRET_KEY || '',
  baseUrl: 'https://api.chapa.co/v1'
};

const initializeChapaPayment = async (paymentData) => {
  try {
    const response = await axios.post(`${chapaConfig.baseUrl}/transaction/initialize`, paymentData, {
      headers: {
        Authorization: `Bearer ${chapaConfig.secretKey}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message);
  }
};

const verifyChapaPayment = async (txRef) => {
  try {
    const response = await axios.get(`${chapaConfig.baseUrl}/transaction/verify/${txRef}`, {
      headers: {
        Authorization: `Bearer ${chapaConfig.secretKey}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message);
  }
};

module.exports = { chapaConfig, initializeChapaPayment, verifyChapaPayment };
