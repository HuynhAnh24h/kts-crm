import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('kts_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/verify-2fa') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('kts_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post('/api/v1/auth/refresh', { refreshToken });
          const { accessToken, refreshToken: newRefresh } = res.data.data;
          localStorage.setItem('kts_access_token', accessToken);
          localStorage.setItem('kts_refresh_token', newRefresh);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } catch {
          localStorage.removeItem('kts_access_token');
          localStorage.removeItem('kts_refresh_token');
          localStorage.removeItem('kts_user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
