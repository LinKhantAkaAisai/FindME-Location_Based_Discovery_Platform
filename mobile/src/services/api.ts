import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@env';

// Use the base URL from environment variables
export const BASE_URL = API_BASE_URL;
console.log('[API] Using BASE_URL:', BASE_URL);
export const UPLOADS_URL = `${BASE_URL}/uploads`;

export const apiRequest = async (endpoint: string, options: any = {}) => {
  try {
    const token = await AsyncStorage.getItem('findme_token');

    const headers: any = {
      ...(options.isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Server returned an invalid format. Check backend logs.');
    }

    if (!response.ok) {
      // Log for debugging if needed
      console.log(`API Error on ${endpoint}:`, data.error);
      throw new Error(data.error || 'API Request failed');
    }

    return data;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Request timeout. Please check your connection.');
    }
    throw new Error(err.message || 'Network Error');
  }
};

// --- AUTH ACTIONS ---

export const registerUser = async (username: string, email: string, password: string, phone_number?: string) => {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password, phone_number }),
  });
};

export const loginUser = async (email: string, password: string) => {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

// --- PROFILE ACTIONS ---

export const fetchMyProfile = async () => {
  return apiRequest('/api/my-profile', {
    method: 'GET',
  });
};

export const fetchUserProfile = async (username: string) => {
  if (username === 'me') {
    return fetchMyProfile();
  }
  return apiRequest(`/api/user-profile/${username}`, {
    method: 'GET',
  });
};

export const updateProfile = async (formData: FormData) => {
  const token = await AsyncStorage.getItem('findme_token');
  const response = await fetch(`${BASE_URL}/api/update-profile`, {
    method: 'PUT',
    body: formData,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update profile');
  }

  return response.json();
};

// --- SHOP DATA ---

export const fetchMyShops = async () => {
  return apiRequest('/api/my-shops', {
    method: 'GET',
  });
};

export const updateShop = async (shopId: number, shopData: any, isFormData: boolean = false) => {
  return apiRequest(`/api/update-shop/${shopId}`, {
    method: 'PUT',
    body: isFormData ? shopData : JSON.stringify(shopData),
    isFormData: isFormData
  });
};

// --- DEV FUNCTIONS ---

export const fetchDevUsers = async () => {
  return apiRequest('/api/dev/users', { method: 'GET' });
};

export const fetchDevStats = async () => {
  return apiRequest('/api/dev/stats', { method: 'GET' });
};

export const fetchDevLatestInserts = async () => {
  return apiRequest('/api/dev/latest-inserts', { method: 'GET' });
};

export const fetchShops = async (query?: string) => {
  let url = '/api/shops';
  if (query) {
    url += `?q=${encodeURIComponent(query)}`;
  }
  return apiRequest(url, {
    method: 'GET',
  });
};

// --- SHOP FOLLOW ACTIONS ---

export const toggleFollowShop = async (shopId: number) => {
  return apiRequest(`/api/shops/${shopId}/follow`, { method: 'POST' });
};

export const fetchFollowStatus = async (shopId: number) => {
  return apiRequest(`/api/shops/${shopId}/follow-status`, { method: 'GET' });
};

export const fetchFollowedShops = async () => {
  return apiRequest('/api/my-followed-shops', { method: 'GET' });
};

// --- POST ACTIONS ---

export const fetchPosts = async (filters?: { category?: string; tag?: string; sort?: string; q?: string }) => {
  let endpoint = '/api/posts';
  const params: string[] = [];
  if (filters?.category) params.push(`category=${filters.category}`);
  if (filters?.tag) params.push(`tag=${filters.tag}`);
  if (filters?.sort) params.push(`sort=${filters.sort}`);
  if (filters?.q) params.push(`q=${encodeURIComponent(filters.q)}`);
  if (params.length) endpoint += '?' + params.join('&');
  return apiRequest(endpoint, { method: 'GET' });
};

export const toggleReaction = async (postId: number) => {
  return apiRequest(`/api/posts/${postId}/react`, { method: 'POST' });
};

export const togglePostBookmark = async (postId: number) => {
  return apiRequest(`/api/posts/${postId}/bookmark`, { method: 'POST' });
};

export const fetchBookmarkedPosts = async () => {
  return apiRequest('/api/posts/bookmarked', { method: 'GET' });
};

export const fetchShopPosts = async (shopId: number) => {
  return apiRequest(`/api/shop-posts/${shopId}`, { method: 'GET' });
};

export const updatePost = async (postId: number, formData: FormData) => {
  return apiRequest(`/api/posts/${postId}`, {
    method: 'PUT',
    body: formData,
    isFormData: true,
  });
};

export const deletePost_User = async (postId: number) => {
  return apiRequest(`/api/posts/${postId}`, {
    method: 'DELETE',
  });
};

export const searchUsers = async (query: string) => {
  return apiRequest(`/api/users/search?q=${encodeURIComponent(query)}`, { method: 'GET' });
};

export const fetchComments = async (postId: number) => {
  return apiRequest(`/api/posts/${postId}/comments`, { method: 'GET' });
};

export const addComment = async (postId: number, content: string) => {
  return apiRequest(`/api/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
};

// Used when creating a new post with a photo
export const createPost = async (formData: FormData) => {
  const token = await AsyncStorage.getItem('findme_token');

  const response = await fetch(`${BASE_URL}/api/posts/create`, {
    method: 'POST',
    body: formData,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return response.json();
};

// --- SHOP ACTIONS ---

export const fetchShopById = async (shop_id: number) => {
  return apiRequest(`/api/shops/${shop_id}`, {
    method: 'GET',
  });
};

export const createShop = async (shopData: any) => {
  return apiRequest('/api/shops', {
    method: 'POST',
    body: JSON.stringify(shopData),
  });
};

export const registerShop = async (formData: FormData) => {
  const token = await AsyncStorage.getItem('findme_token');
  const response = await fetch(`${BASE_URL}/api/register-shop`, {
    method: 'POST',
    body: formData,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Invalid server response'); }
  if (!response.ok) throw new Error(data.error || 'Registration failed');
  return data;
};

// --- ADMIN ACTIONS ---

export const fetchPendingShops = async () => {
  return apiRequest('/api/admin/pending-shops', { method: 'GET' });
};

export const approveShop = async (shopId: number) => {
  return apiRequest(`/api/admin/approve-shop/${shopId}`, { method: 'POST' });
};

export const rejectShop = async (shopId: number) => {
  return apiRequest(`/api/admin/reject-shop/${shopId}`, { method: 'POST' });
};

export const freezeShop = async (shopId: number) => {
  return apiRequest(`/api/admin/freeze-shop/${shopId}`, { method: 'POST' });
};

export const unfreezeShop = async (shopId: number) => {
  return apiRequest(`/api/admin/unfreeze-shop/${shopId}`, { method: 'POST' });
};

export const fetchAllPosts = async () => {
  return apiRequest('/api/admin/all-posts', { method: 'GET' });
};

export const deletePost_Admin = async (postId: number) => {
  return apiRequest(`/api/admin/delete-post/${postId}`, { method: 'DELETE' });
};

export const submitMonthlyPayment = async (formData: FormData) => {
  return apiRequest('/api/shop/submit-monthly-payment', {
    method: 'POST',
    body: formData,
    isFormData: true
  });
};

export const fetchPaymentHistory = async (shopId: number) => {
  return apiRequest(`/api/shop/payment-history/${shopId}`, { method: 'GET' });
};

export const fetchSubscriptionStatus = async (shopId: number) => {
  return apiRequest(`/api/shop/subscription-status/${shopId}`, { method: 'GET' });
};

export const validateMonthlyPayment = async (paymentId: number) => {
  return apiRequest(`/api/admin/validate-monthly-payment/${paymentId}`, { method: 'POST' });
};

// --- SHOP ADMIN ACTIONS ---

export const inviteShopAdmin = async (shopId: number, invitedUserId: number) => {
  return apiRequest('/api/shop-admin/invite', {
    method: 'POST',
    body: JSON.stringify({ shopId, invitedUserId }),
  });
};

export const fetchShopAdmins = async (shopId: number) => {
  return apiRequest(`/api/shop-admin/${shopId}/list`, { method: 'GET' });
};

export const removeShopAdmin = async (shopId: number, userId: number) => {
  return apiRequest(`/api/shop-admin/${shopId}/remove/${userId}`, { method: 'DELETE' });
};

export const fetchNotifications = async () => {
  return apiRequest('/api/notifications', { method: 'GET' });
};

export const markNotificationsSeen = async () => {
  return apiRequest('/api/notifications/seen', { method: 'POST' });
};

export const respondToInvitation = async (invitationId: number, action: 'Accept' | 'Decline') => {
  return apiRequest(`/api/notifications/${invitationId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
};

// --- CHECK-IN (TAGGED SHOPS) ACTIONS ---

export const fetchMyCheckIns = async () => {
  return apiRequest('/api/users/me/check-ins', {
    method: 'GET',
  });
};

// --- BOOKMARK ACTIONS ---

export const getBookmarks = async () => {
  return apiRequest('/api/bookmarks', {
    method: 'GET',
  });
};

// --- PAYMENT ACTIONS ---

export const createPayment = async (paymentData: any) => {
  return apiRequest('/api/payments', {
    method: 'POST',
    body: JSON.stringify(paymentData),
  });
};

