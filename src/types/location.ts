export interface BusinessHours {
  mon?: string;
  tue?: string;
  wed?: string;
  thu?: string;
  fri?: string;
  sat?: string;
  sun?: string;
}

export interface Location {
  id?: number;
  _id?: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  business_hours?: BusinessHours;
  category: 'restaurant' | 'store' | 'office' | 'service' | 'other';
  image_url?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  radius_unit?: 'km' | 'mi';
  instanceId?: string;
  compId?: string;
  created_at?: string;
  updated_at?: string;
}

export function formatRadiusLabel(radius?: number, unit?: 'km' | 'mi'): string | null {
  if (radius == null || radius <= 0) return null;
  if (unit === 'mi') {
    return `${radius} ${radius === 1 ? 'mile' : 'miles'}`;
  }
  return `${radius} km`;
}

export function radiusToMeters(radius: number, unit?: 'km' | 'mi'): number {
  if (unit === 'mi') return radius * 1609.34;
  return radius * 1000;
}
