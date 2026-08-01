// Example React Frontend API Service using Axios
// Place this in your React frontend at src/services/api.js

import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Automatically attach JWT token to requests if available
API.interceptors.request.use((config) => {
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    const { token } = JSON.parse(userInfo);
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const registerUser = (userData) => API.post('/auth/register', userData);
export const loginUser = (credentials) => API.post('/auth/login', credentials);
export const getUserProfile = () => API.get('/auth/profile');

// Course APIs
export const getCourses = () => API.get('/courses');
export const getCourseById = (id) => API.get(`/courses/${id}`);

// Asset APIs
export const getAssets = (category = '', search = '') => API.get(`/assets?category=${category}&search=${search}`);
export const getAssetById = (id) => API.get(`/assets/${id}`);

// Payment APIs (Chapa)
export const initializePayment = (paymentData) => API.post('/payments/initialize', paymentData);
export const verifyPayment = (txRef) => API.get(`/payments/verify/${txRef}`);

// Service Inquiry APIs
export const submitInquiry = (inquiryData) => API.post('/services/inquiry', inquiryData);
