import axios from "axios";

// In Replit, we need to use the public URL, not localhost
const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // For Replit, construct the backend URL from the current host
  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname;
    // Replace the port with 8000 for the backend
    return `https://${currentHost}:8000/api`;
  }
  
  return "http://localhost:8000/api";
};

const API_URL = getApiUrl();

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

export const supplierApi = {
  getAll: () => api.get("/suppliers"),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post("/suppliers", data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
};

export const vehicleApi = {
  getAll: () => api.get("/vehicles"),
  getById: (id) => api.get(`/vehicles/${id}`),
  getAvailableForTesting: () => api.get("/vehicles/available-for-testing"),
  create: (formData) => {
    return axios.post(`${API_URL}/vehicles`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};

export const labTestApi = {
  getAll: () => api.get("/lab-tests"),
  getById: (id) => api.get(`/lab-tests/${id}`),
  create: (data) => api.post("/lab-tests", data),
  delete: (id) => api.delete(`/lab-tests/${id}`),
};

export const claimApi = {
  getAll: () => api.get("/claims"),
  create: (data) => api.post("/claims/create", data),
  update: (id, data) => api.patch(`/claims/${id}`, data),
};

const STATIC_STATES = [
  { state_id: 1, state_name: "Andhra Pradesh" },
  { state_id: 2, state_name: "Arunachal Pradesh" },
  { state_id: 3, state_name: "Assam" },
  { state_id: 4, state_name: "Bihar" },
  { state_id: 5, state_name: "Chhattisgarh" },
  { state_id: 6, state_name: "Goa" },
  { state_id: 7, state_name: "Gujarat" },
  { state_id: 8, state_name: "Haryana" },
  { state_id: 9, state_name: "Himachal Pradesh" },
  { state_id: 10, state_name: "Jharkhand" },
  { state_id: 11, state_name: "Karnataka" },
  { state_id: 12, state_name: "Kerala" },
  { state_id: 13, state_name: "Madhya Pradesh" },
  { state_id: 14, state_name: "Maharashtra" },
  { state_id: 15, state_name: "Manipur" },
  { state_id: 16, state_name: "Meghalaya" },
  { state_id: 17, state_name: "Mizoram" },
  { state_id: 18, state_name: "Nagaland" },
  { state_id: 19, state_name: "Odisha" },
  { state_id: 20, state_name: "Punjab" },
  { state_id: 21, state_name: "Rajasthan" },
  { state_id: 22, state_name: "Sikkim" },
  { state_id: 23, state_name: "Tamil Nadu" },
  { state_id: 24, state_name: "Telangana" },
  { state_id: 25, state_name: "Tripura" },
  { state_id: 26, state_name: "Uttar Pradesh" },
  { state_id: 27, state_name: "Uttarakhand" },
  { state_id: 28, state_name: "West Bengal" },
  { state_id: 29, state_name: "Delhi" },
  { state_id: 30, state_name: "Jammu and Kashmir" },
  { state_id: 31, state_name: "Ladakh" },
  { state_id: 32, state_name: "Puducherry" },
  { state_id: 33, state_name: "Chandigarh" },
];

const STATIC_CITIES = {
  26: [
    { district_id: 1, district_name: "Agra" },
    { district_id: 2, district_name: "Aligarh" },
    { district_id: 3, district_name: "Allahabad" },
    { district_id: 4, district_name: "Ambedkar Nagar" },
    { district_id: 5, district_name: "Amethi" },
    { district_id: 6, district_name: "Amroha" },
    { district_id: 7, district_name: "Auraiya" },
    { district_id: 8, district_name: "Azamgarh" },
    { district_id: 9, district_name: "Baghpat" },
    { district_id: 10, district_name: "Bahraich" },
    { district_id: 11, district_name: "Ballia" },
    { district_id: 12, district_name: "Balrampur" },
    { district_id: 13, district_name: "Banda" },
    { district_id: 14, district_name: "Barabanki" },
    { district_id: 15, district_name: "Bareilly" },
    { district_id: 16, district_name: "Basti" },
    { district_id: 17, district_name: "Bijnor" },
    { district_id: 18, district_name: "Budaun" },
    { district_id: 19, district_name: "Bulandshahr" },
    { district_id: 20, district_name: "Chandauli" },
    { district_id: 21, district_name: "Chitrakoot" },
    { district_id: 22, district_name: "Deoria" },
    { district_id: 23, district_name: "Etah" },
    { district_id: 24, district_name: "Etawah" },
    { district_id: 25, district_name: "Faizabad" },
    { district_id: 26, district_name: "Farrukhabad" },
    { district_id: 27, district_name: "Fatehpur" },
    { district_id: 28, district_name: "Firozabad" },
    { district_id: 29, district_name: "Gautam Buddha Nagar" },
    { district_id: 30, district_name: "Ghaziabad" },
    { district_id: 31, district_name: "Ghazipur" },
    { district_id: 32, district_name: "Gonda" },
    { district_id: 33, district_name: "Gorakhpur" },
    { district_id: 34, district_name: "Hamirpur" },
    { district_id: 35, district_name: "Hapur" },
    { district_id: 36, district_name: "Hardoi" },
    { district_id: 37, district_name: "Hathras" },
    { district_id: 38, district_name: "Jalaun" },
    { district_id: 39, district_name: "Jaunpur" },
    { district_id: 40, district_name: "Jhansi" },
    { district_id: 41, district_name: "Kannauj" },
    { district_id: 42, district_name: "Kanpur Dehat" },
    { district_id: 43, district_name: "Kanpur Nagar" },
    { district_id: 44, district_name: "Kasganj" },
    { district_id: 45, district_name: "Kaushambi" },
    { district_id: 46, district_name: "Kushinagar" },
    { district_id: 47, district_name: "Lakhimpur Kheri" },
    { district_id: 48, district_name: "Lalitpur" },
    { district_id: 49, district_name: "Lucknow" },
    { district_id: 50, district_name: "Maharajganj" },
    { district_id: 51, district_name: "Mahoba" },
    { district_id: 52, district_name: "Mainpuri" },
    { district_id: 53, district_name: "Mathura" },
    { district_id: 54, district_name: "Mau" },
    { district_id: 55, district_name: "Meerut" },
    { district_id: 56, district_name: "Mirzapur" },
    { district_id: 57, district_name: "Moradabad" },
    { district_id: 58, district_name: "Muzaffarnagar" },
    { district_id: 59, district_name: "Pilibhit" },
    { district_id: 60, district_name: "Pratapgarh" },
    { district_id: 61, district_name: "Prayagraj" },
    { district_id: 62, district_name: "Raebareli" },
    { district_id: 63, district_name: "Rampur" },
    { district_id: 64, district_name: "Saharanpur" },
    { district_id: 65, district_name: "Sambhal" },
    { district_id: 66, district_name: "Sant Kabir Nagar" },
    { district_id: 67, district_name: "Shahjahanpur" },
    { district_id: 68, district_name: "Shamli" },
    { district_id: 69, district_name: "Shravasti" },
    { district_id: 70, district_name: "Siddharthnagar" },
    { district_id: 71, district_name: "Sitapur" },
    { district_id: 72, district_name: "Sonbhadra" },
    { district_id: 73, district_name: "Sultanpur" },
    { district_id: 74, district_name: "Unnao" },
    { district_id: 75, district_name: "Varanasi" },
  ],
  14: [
    { district_id: 101, district_name: "Mumbai" },
    { district_id: 102, district_name: "Pune" },
    { district_id: 103, district_name: "Nagpur" },
    { district_id: 104, district_name: "Nashik" },
    { district_id: 105, district_name: "Aurangabad" },
    { district_id: 106, district_name: "Solapur" },
    { district_id: 107, district_name: "Kolhapur" },
    { district_id: 108, district_name: "Thane" },
    { district_id: 109, district_name: "Raigad" },
    { district_id: 110, district_name: "Ahmednagar" },
  ],
  29: [
    { district_id: 201, district_name: "Central Delhi" },
    { district_id: 202, district_name: "East Delhi" },
    { district_id: 203, district_name: "New Delhi" },
    { district_id: 204, district_name: "North Delhi" },
    { district_id: 205, district_name: "North East Delhi" },
    { district_id: 206, district_name: "North West Delhi" },
    { district_id: 207, district_name: "South Delhi" },
    { district_id: 208, district_name: "South East Delhi" },
    { district_id: 209, district_name: "South West Delhi" },
    { district_id: 210, district_name: "West Delhi" },
  ],
};

export const stateCityApi = {
  getStates: async () => {
    try {
      const response = await axios.get(
        "https://cdn-api.co-vin.in/api/v2/admin/location/states",
      );
      if (
        response.data &&
        response.data.states &&
        response.data.states.length > 0
      ) {
        return response.data.states;
      }
      return STATIC_STATES;
    } catch (error) {
      console.log("Using static states data (API unavailable)");
      return STATIC_STATES;
    }
  },
  getCities: async (stateId) => {
    try {
      const response = await axios.get(
        `https://cdn-api.co-vin.in/api/v2/admin/location/districts/${stateId}`,
      );
      if (
        response.data &&
        response.data.districts &&
        response.data.districts.length > 0
      ) {
        return response.data.districts;
      }
      return STATIC_CITIES[stateId] || [];
    } catch (error) {
      console.log("Using static cities data (API unavailable)");
      return STATIC_CITIES[stateId] || [];
    }
  },
};
