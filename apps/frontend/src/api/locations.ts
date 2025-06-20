import { Location, LocationMovement, LocationInteraction, LocationQuery, APIResponse, PaginatedResponse, ID } from '@ai-agent-trpg/types';

const API_BASE = '/api/locations';

export interface CreateLocationData {
  name: string;
  description: string;
  type: Location['type'];
  parentLocationId?: ID;
  coordinates?: Location['coordinates'];
  environment: Location['environment'];
  access?: Partial<Location['access']>;
  properties?: Partial<Location['properties']>;
  aiData?: Location['aiData'];
}

export interface MoveCharacterData {
  characterId: ID;
  toLocationId: ID;
  movementType?: LocationMovement['movementType'];
  transportMethod?: string;
  estimatedDuration?: number;
  companions?: ID[];
}

// ==========================================
// 場所管理
// ==========================================

export async function getLocations(query?: LocationQuery): Promise<PaginatedResponse<Location>> {
  const searchParams = new URLSearchParams();
  
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          searchParams.append(key, value.join(','));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });
  }

  const response = await fetch(`${API_BASE}?${searchParams}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result: APIResponse<PaginatedResponse<Location>> = await response.json();
  if (!result.success) {
    throw new Error('Failed to fetch locations');
  }
  
  return result.data;
}

export async function getLocationById(id: ID): Promise<Location> {
  const response = await fetch(`${API_BASE}/${id}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result: APIResponse<Location> = await response.json();
  if (!result.success) {
    throw new Error('Failed to fetch location');
  }
  
  return result.data;
}

export async function createLocation(data: CreateLocationData): Promise<Location> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result: APIResponse<Location> = await response.json();
  if (!result.success) {
    throw new Error('Failed to create location');
  }
  
  return result.data;
}

export async function updateLocation(id: ID, updates: Partial<Location>): Promise<Location> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result: APIResponse<Location> = await response.json();
  if (!result.success) {
    throw new Error('Failed to update location');
  }
  
  return result.data;
}

export async function deleteLocation(id: ID): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result: APIResponse<{ success: boolean }> = await response.json();
  if (!result.success) {
    throw new Error('Failed to delete location');
  }
}

// ==========================================
// 場所での存在情報
// ==========================================

export async function getCharactersInLocation(locationId: ID) {
  const response = await fetch(`${API_BASE}/${locationId}/characters`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result: APIResponse<any[]> = await response.json();
  if (!result.success) {
    throw new Error('Failed to fetch characters in location');
  }
  
  return result.data;
}

export async function getEventsInLocation(locationId: ID) {
  const response = await fetch(`${API_BASE}/${locationId}/events`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result: APIResponse<any[]> = await response.json();
  if (!result.success) {
    throw new Error('Failed to fetch events in location');
  }
  
  return result.data;
}

export async function getConnectedLocations(locationId: ID): Promise<Location[]> {
  const response = await fetch(`${API_BASE}/${locationId}/connections`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result: APIResponse<Location[]> = await response.json();
  if (!result.success) {
    throw new Error('Failed to fetch connected locations');
  }
  
  return result.data;
}

export async function getNearbyLocations(locationId: ID, maxDistance?: number): Promise<Location[]> {
  const searchParams = new URLSearchParams();
  if (maxDistance !== undefined) {
    searchParams.append('maxDistance', String(maxDistance));
  }
  
  const response = await fetch(`${API_BASE}/${locationId}/nearby?${searchParams}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result: APIResponse<Location[]> = await response.json();
  if (!result.success) {
    throw new Error('Failed to fetch nearby locations');
  }
  
  return result.data;
}

// ==========================================
// キャラクター移動
// ==========================================

export async function moveCharacter(data: MoveCharacterData): Promise<LocationMovement> {
  const response = await fetch(`${API_BASE}/move`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result: APIResponse<LocationMovement> = await response.json();
  if (!result.success) {
    throw new Error('Failed to move character');
  }
  
  return result.data;
}

// ==========================================
// 場所での相互作用
// ==========================================

export async function createLocationInteraction(
  locationId: ID,
  characterId: ID,
  interactionType: LocationInteraction['interactionType'],
  details: LocationInteraction['details'],
  context?: LocationInteraction['context']
): Promise<LocationInteraction> {
  const response = await fetch(`${API_BASE}/${locationId}/interactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      characterId,
      interactionType,
      details,
      context: context || {},
    }),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result: APIResponse<LocationInteraction> = await response.json();
  if (!result.success) {
    throw new Error('Failed to create location interaction');
  }
  
  return result.data;
}

export async function getLocationInteractions(
  locationId: ID,
  characterId?: ID,
  interactionType?: LocationInteraction['interactionType']
): Promise<LocationInteraction[]> {
  const searchParams = new URLSearchParams();
  if (characterId) {
    searchParams.append('characterId', characterId);
  }
  if (interactionType) {
    searchParams.append('interactionType', interactionType);
  }
  
  const response = await fetch(`${API_BASE}/${locationId}/interactions?${searchParams}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result: APIResponse<LocationInteraction[]> = await response.json();
  if (!result.success) {
    throw new Error('Failed to fetch location interactions');
  }
  
  return result.data;
}

// ==========================================
// 便利な機能
// ==========================================

export async function seedDefaultLocations(): Promise<Location[]> {
  const response = await fetch(`${API_BASE}/seed/default`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result: APIResponse<Location[]> = await response.json();
  if (!result.success) {
    throw new Error('Failed to seed default locations');
  }
  
  return result.data;
}