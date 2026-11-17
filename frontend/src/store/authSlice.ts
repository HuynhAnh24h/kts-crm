import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserAccount } from '../types/crm';

interface AuthState {
  user: UserAccount | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

const storedUser = localStorage.getItem('kts_user');
const storedToken = localStorage.getItem('kts_access_token');

const initialState: AuthState = {
  user: storedUser ? JSON.parse(storedUser) : null,
  accessToken: storedToken || null,
  isAuthenticated: Boolean(storedToken && storedUser),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession: (
      state,
      action: PayloadAction<{
        user: UserAccount;
        accessToken: string;
        refreshToken: string;
      }>
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      localStorage.setItem('kts_access_token', action.payload.accessToken);
      localStorage.setItem('kts_refresh_token', action.payload.refreshToken);
      localStorage.setItem('kts_user', JSON.stringify(action.payload.user));
    },
    updateCurrentUser: (state, action: PayloadAction<UserAccount>) => {
      state.user = action.payload;
      localStorage.setItem('kts_user', JSON.stringify(action.payload));
    },
    clearSession: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem('kts_access_token');
      localStorage.removeItem('kts_refresh_token');
      localStorage.removeItem('kts_user');
    },
  },
});

export const { setSession, updateCurrentUser, clearSession } = authSlice.actions;
export default authSlice.reducer;
