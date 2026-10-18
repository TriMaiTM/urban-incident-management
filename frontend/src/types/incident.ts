/**
 * TypeScript types for incident reporting, nearby incidents, categories, and duplicate voting.
 * Aligned with backend Pydantic schemas in backend/app/schemas/incident.py.
 */

export interface CategoryOut {
  id: string;
  code: string;
  name: string;
  description: string | null;
  default_priority: string;
  default_sla_hours: number;
  is_active: boolean;
  default_department_id?: string | null;
}

export interface IncidentNearbyItem {
  id: string;
  ticket_code: string;
  title: string;
  status: string;
  priority: string;
  distance_meters: number;
  latitude: number;
  longitude: number;
  created_at: string;
  image_url: string | null;
}

export interface IncidentNearbyOut {
  count: number;
  items: IncidentNearbyItem[];
}

export interface IncidentCreateResponse {
  id: string;
  ticket_code: string;
  title: string;
  status: string;
  priority: string;
  duplicate_count: number;
  sla_due_at: string | null;
  created_at: string;
  message?: string;
}

export interface IncidentVoteDuplicateOut {
  incident_id: string;
  ticket_code: string;
  previous_count: number;
  new_count: number;
  duplicate_count?: number;
  message: string;
}
