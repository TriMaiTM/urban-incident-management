/**
 * TypeScript types for geographical zones and geofencing validation.
 * Aligned with backend Pydantic schemas in backend/app/schemas/zone.py.
 */

export interface GeoJSONGeometry {
  type: string;
  coordinates: unknown;
}

export interface SystemZoneOut {
  id: string;
  name: string;
  is_active: boolean;
  bounding_box: [number, number, number, number] | null;
  description: string | null;
  geojson_geometry: GeoJSONGeometry | null;
}

export interface LocationValidateIn {
  latitude: number;
  longitude: number;
}

export interface LocationValidateOut {
  is_inside: boolean;
  zone_id: string | null;
  zone_name: string | null;
  message: string;
}
