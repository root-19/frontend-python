import axios from 'axios'


export const API_BASE_URL = 'https://fintech-limitlessstudies.limitlessstudies.com/api'
export const API_SERVER_URL = 'https://fintech-limitlessstudies.limitlessstudies.com'
const api = axios.create({
  baseURL: API_BASE_URL,
})



api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`
  }
  return config
})

// Handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
    
      try {
        localStorage.removeItem('token')
        localStorage.removeItem('role')
        localStorage.removeItem('userId')
        localStorage.removeItem('username')
      } catch {}
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// New: TypeScript interfaces for upload results and analysis
export interface UploadResult {
  status: string;
  confidence_score: number;  // Existing (likely CNN)
  explanation: string;
  final_fraud_score?: number;
  scores?: {
    ocr_confidence: number;
    field_anomaly: number;
    cnn_fraud_probability: number;
  };
  cnn_details?: {
    platform_checks?: { [key: string]: number };
    [key: string]: any;
  };
  extracted_data: {
    amount?: string;
    date?: string;
    reference_number?: string;
    context_text?: string[];
    [key: string]: any;  // Allow additional metadata
  };
  ocr_confidences?: { [field: string]: number };  // New: Per-field OCR confidence
  field_anomalies?: { [field: string]: number };  // New: Field-level validation scores (0-1)
  field_validations?: { [field: string]: { valid?: boolean; anomaly?: number; reasons?: string[] } };
  cnn_probability?: number;  // New: Image-level CNN fraud probability (0-1)
  final_anomaly_score?: number;  // New: Combined weighted score (0-1)
  character_features?: {
    mean_confidence: number;
    median_confidence: number;
    min_confidence: number;
  };
  anomaly_details?: string[];  // New: List of anomaly reasons
}

export interface DetailedAnalysis {
  ocr_confidences: { [field: string]: number };
  field_anomalies: { [field: string]: number };
  field_validations?: { [field: string]: { valid?: boolean; anomaly?: number; reasons?: string[] } };
  cnn_probability: number;
  final_anomaly_score: number;
  anomaly_details: string[];
  platform_checks?: { [key: string]: number };
}

export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
}

export const uploadAPI = {
  upload: (formData: FormData) => {
    return api.post('/upload/', formData)
  },
  getHistory: () => api.get('/upload/history'),
  postCorrection: (data: { upload_id: number; field: string; value: string }) => api.post('/upload/corrections', data),
  rescore: (data: { upload_id: number; overrides: Record<string, any> }) => api.post('/upload/rescore', data),
}

export const reviewAPI = {
  createAppeal: (data: { upload_id: number; reason: string }) => api.post('/appeals/', data),
  getPendingAppeals: () => api.get('/review/appeals/pending'),
  reviewAppeal: (data: { appeal_id: number; approved: boolean; comment: string }) => {
    const status = data.approved ? 'approved' : 'rejected'
    return api.put(`/appeals/${data.appeal_id}/resolve`, { status, response: data.comment })
  },
  createAdminRequest: (data: any) => api.post('/review/admin-request', data),
  getAdminRequests: () => api.get('/review/admin-requests'),
  resolveAdminRequest: (requestId: number, data: { approved: boolean; comment?: string }) => api.put(`/review/admin-requests/${requestId}/resolve`, data),
  getAdminRequestHistory: () => api.get('/review/admin-requests/history'),
  getMyAdminRequests: () => api.get('/review/admin-requests/my'),
  getUserAppeals: () => api.get('/appeals/'),
  getAppealHistory: () => api.get('/appeals/history'),
  requestArchiveAccess: (year: number, reason?: string) => api.post('/review/archive-access/request', { year, reason }),
  getArchiveAccessRequests: () => api.get('/review/archive-access/requests'),
  resolveArchiveAccessRequest: (id: number, approved: boolean) => api.put(`/review/archive-access/requests/${id}/resolve`, { approved }),
  getMyArchiveAccessRequests: () => api.get('/review/archive-access/my'),
}

// New: API for detailed analysis (fetches OCR/CNN metadata)
export const analysisAPI = {
  getDetailedAnalysis: (uploadId: number) => api.get(`/upload/analysis/${uploadId}`),  // Returns DetailedAnalysis
}

export const adminAPI = {
  getDashboardStats: () => api.get('/admin/dashboard/stats'),
  getAllUploads: () => api.get('/admin/dashboard/uploads'),
  getAllUsers: () => api.get('/admin/users'),
  createUser: (data: { username: string; password: string; email?: string; phone?: string; role: 'supervisor' | 'manager' }) => api.post('/admin/users', data),
  getAllAppeals: () => api.get('/appeals/all'),
  undoAppeal: (appealId: number, data?: { notice?: string }) => api.put(`/appeals/${appealId}/undo`, data || {}),
  getArchiveYears: () => api.get('/admin/archives/years'),
  getArchiveByYear: (year: number) => api.get(`/admin/archives/${year}`),
  getSupervisorArchiveAccess: () => api.get('/admin/archives/access'),
}

export default api

