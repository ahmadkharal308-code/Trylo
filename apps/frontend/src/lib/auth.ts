export const getToken = () => localStorage.getItem('trylo_token');
export const setToken = (t: string) => localStorage.setItem('trylo_token', t);
export const clearToken = () => localStorage.removeItem('trylo_token');
export const isLoggedIn = () => !!getToken();
