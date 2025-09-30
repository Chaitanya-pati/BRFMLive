import axios from 'axios';

const API_URL = 'https://28282886-3281-4c61-b476-c084ef2ed486-00-1v4f3ak1jsbf5.spock.replit.dev:8000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const supplierApi = {
  getAll: () => api.get('/suppliers'),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
};

export const vehicleApi = {
  getAll: () => api.get('/vehicles'),
  getById: (id) => api.get(`/vehicles/${id}`),
  create: (formData) => {
    return axios.post(`${API_URL}/vehicles`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export const labTestApi = {
  getAll: () => api.get('/lab-tests'),
  getById: (id) => api.get(`/lab-tests/${id}`),
  create: (data) => api.post('/lab-tests', data),
};

export const stateCityApi = {
  getStates: async () => {
    try {
      const response = await axios.get('https://cdn-api.co-vin.in/api/v2/admin/location/states');
      return response.data.states;
    } catch (error) {
      console.error('Error fetching states:', error);
      return [];
    }
  },
  getCities: async (stateId) => {
    try {
      const response = await axios.get(`https://cdn-api.co-vin.in/api/v2/admin/location/districts/${stateId}`);
      return response.data.districts;
    } catch (error) {
      console.error('Error fetching cities:', error);
      return [];
    }
  },
};
