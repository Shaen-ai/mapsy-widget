import axios from 'axios';
import { Location } from '../types/location';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const locationService = {
  getAll: async (): Promise<Location[]> => {
    const response = await api.get('/locations');
    return response.data;
  },
};

export const widgetConfigService = {
  getConfig: async () => {
    const response = await api.get('/widget-config');
    return response.data;
  },
};