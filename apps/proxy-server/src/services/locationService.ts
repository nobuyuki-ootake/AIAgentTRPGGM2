import { 
  Location, 
  LocationMovement, 
  LocationInteraction, 
  Character,
  ID,
  PaginatedResponse 
} from '@ai-agent-trpg/types';
import { database } from '../database/database';
import { v4 as uuidv4 } from 'uuid';

export interface CreateLocationData {
  name: string;
  description: string;
  type: Location['type'];
  parentLocationId?: ID;
  coordinates?: Location['coordinates'];
  climate: string;
  terrain: string[];
  tags?: string[];
  imageUrl?: string;
}

export interface MoveCharacterData {
  characterId: ID;
  toLocationId: ID;
  method?: string;
  estimatedDuration?: number;
  companions?: ID[];
}

export interface LocationSearchQuery {
  name?: string;
  type?: string[];
  parentLocationId?: ID;
  isKnown?: boolean;
  page?: number;
  limit?: number;
}

class LocationService {
  // ==========================================
  // 場所管理
  // ==========================================

  async getLocations(query?: LocationSearchQuery): Promise<PaginatedResponse<Location>> {
    let sql = 'SELECT * FROM locations WHERE 1=1';
    const params: any[] = [];

    if (query?.name) {
      sql += ' AND name LIKE ?';
      params.push(`%${query.name}%`);
    }

    if (query?.type && query.type.length > 0) {
      sql += ` AND type IN (${query.type.map(() => '?').join(', ')})`;
      params.push(...query.type);
    }

    if (query?.parentLocationId) {
      sql += ' AND parent_location_id = ?';
      params.push(query.parentLocationId);
    }

    if (query?.isKnown !== undefined) {
      sql += ' AND is_discovered = ?';
      params.push(query.isKnown ? 1 : 0);
    }

    // ページング
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const offset = (page - 1) * limit;

    // 総数取得
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = database.prepare(countSql).get(...params) as { count: number };
    const totalCount = countResult.count;

    // データ取得
    sql += ' ORDER BY name ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = database.prepare(sql).all(...params) as any[];
    const locations = rows.map(this.rowToLocation);

    return {
      items: locations,
      totalCount,
      pageSize: limit,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      hasNextPage: page * limit < totalCount,
      hasPreviousPage: page > 1,
    };
  }

  async getLocationById(id: ID): Promise<Location | null> {
    const row = database.prepare('SELECT * FROM locations WHERE id = ?').get(id) as any;
    return row ? this.rowToLocation(row) : null;
  }

  async createLocation(data: CreateLocationData): Promise<Location> {
    const id = uuidv4();

    const location: Location = {
      id,
      name: data.name,
      description: data.description,
      type: data.type,
      parentLocationId: data.parentLocationId,
      childLocationIds: [],
      coordinates: data.coordinates,
      climate: data.climate,
      terrain: data.terrain,
      npcs: [],
      items: [],
      events: [],
      isDiscovered: true,
      visitCount: 0,
      tags: data.tags || [],
      imageUrl: data.imageUrl,
    };

    database.prepare(`
      INSERT INTO locations (
        id, name, description, type, parent_location_id, child_location_ids,
        coordinates, climate, terrain, npcs, items, events,
        is_discovered, first_visit_date, visit_count, tags, image_url, map_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      location.id,
      location.name,
      location.description,
      location.type,
      location.parentLocationId,
      JSON.stringify(location.childLocationIds),
      JSON.stringify(location.coordinates),
      location.climate,
      JSON.stringify(location.terrain),
      JSON.stringify(location.npcs),
      JSON.stringify(location.items),
      JSON.stringify(location.events),
      location.isDiscovered ? 1 : 0,
      location.firstVisitDate,
      location.visitCount,
      JSON.stringify(location.tags),
      location.imageUrl,
      JSON.stringify(location.mapData)
    );

    return location;
  }

  async updateLocation(id: ID, updates: Partial<Location>): Promise<Location | null> {
    const existingLocation = await this.getLocationById(id);
    if (!existingLocation) return null;

    const updatedLocation: Location = {
      ...existingLocation,
      ...updates,
    };

    database.prepare(`
      UPDATE locations SET
        name = ?, description = ?, type = ?, parent_location_id = ?,
        child_location_ids = ?, coordinates = ?, climate = ?, terrain = ?,
        npcs = ?, items = ?, events = ?, is_discovered = ?, 
        first_visit_date = ?, visit_count = ?, tags = ?, image_url = ?, map_data = ?
      WHERE id = ?
    `).run(
      updatedLocation.name,
      updatedLocation.description,
      updatedLocation.type,
      updatedLocation.parentLocationId,
      JSON.stringify(updatedLocation.childLocationIds),
      JSON.stringify(updatedLocation.coordinates),
      updatedLocation.climate,
      JSON.stringify(updatedLocation.terrain),
      JSON.stringify(updatedLocation.npcs),
      JSON.stringify(updatedLocation.items),
      JSON.stringify(updatedLocation.events),
      updatedLocation.isDiscovered ? 1 : 0,
      updatedLocation.firstVisitDate,
      updatedLocation.visitCount,
      JSON.stringify(updatedLocation.tags),
      updatedLocation.imageUrl,
      JSON.stringify(updatedLocation.mapData),
      id
    );

    return updatedLocation;
  }

  // ==========================================
  // キャラクター移動
  // ==========================================

  async moveCharacter(data: MoveCharacterData): Promise<LocationMovement> {
    const character = await this.getCharacterById(data.characterId);
    if (!character) {
      throw new Error(`Character not found: ${data.characterId}`);
    }

    const fromLocationId = character.currentLocationId;
    if (!fromLocationId) {
      throw new Error('Character has no current location');
    }

    const now = new Date().toISOString();

    const movement: LocationMovement = {
      fromLocation: fromLocationId,
      toLocation: data.toLocationId,
      characterId: data.characterId,
      timestamp: now,
      method: data.method || 'walk',
    };

    // 移動記録を保存
    database.prepare(`
      INSERT INTO location_movements (
        id, character_id, from_location_id, to_location_id, timestamp,
        estimated_duration, movement_type, transport_method, status,
        travel_events, costs, companions, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      movement.characterId,
      movement.fromLocation,
      movement.toLocation,
      movement.timestamp,
      data.estimatedDuration || 30,
      movement.method,
      'walking',
      'completed',
      JSON.stringify([]),
      JSON.stringify({}),
      JSON.stringify(data.companions || []),
      now,
      now
    );

    // キャラクターの現在位置を更新
    await this.updateCharacterLocation(data.characterId, data.toLocationId);

    return movement;
  }

  // ==========================================
  // 場所での相互作用
  // ==========================================

  async createLocationInteraction(
    locationId: ID,
    characterId: ID,
    interactionType: string,
    result: string
  ): Promise<LocationInteraction> {
    const now = new Date().toISOString();

    const interaction: LocationInteraction = {
      locationId,
      characterId,
      interactionType,
      result,
      timestamp: now,
    };

    database.prepare(`
      INSERT INTO location_interactions (
        location_id, character_id, interaction_type, result, timestamp
      ) VALUES (?, ?, ?, ?, ?)
    `).run(
      interaction.locationId,
      interaction.characterId,
      interaction.interactionType,
      interaction.result,
      interaction.timestamp
    );

    return interaction;
  }

  // ==========================================
  // ユーティリティメソッド
  // ==========================================

  private async getCharacterById(characterId: ID): Promise<Character | null> {
    const row = database.prepare('SELECT * FROM characters WHERE id = ?').get(characterId) as any;
    if (!row) return null;

    return {
      id: row.id,
      currentLocationId: row.current_location_id,
      // 他のフィールドは省略...
    } as Character;
  }

  private async updateCharacterLocation(characterId: ID, locationId: ID): Promise<void> {
    database.prepare(`
      UPDATE characters 
      SET current_location_id = ?, updated_at = ?
      WHERE id = ?
    `).run(locationId, new Date().toISOString(), characterId);
  }

  private rowToLocation(row: any): Location {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      parentLocationId: row.parent_location_id,
      childLocationIds: JSON.parse(row.child_location_ids || '[]'),
      coordinates: row.coordinates ? JSON.parse(row.coordinates) : undefined,
      climate: row.climate,
      terrain: JSON.parse(row.terrain || '[]'),
      npcs: JSON.parse(row.npcs || '[]'),
      items: JSON.parse(row.items || '[]'),
      events: JSON.parse(row.events || '[]'),
      isDiscovered: row.is_discovered === 1,
      firstVisitDate: row.first_visit_date,
      visitCount: row.visit_count || 0,
      tags: JSON.parse(row.tags || '[]'),
      imageUrl: row.image_url,
      mapData: row.map_data ? JSON.parse(row.map_data) : undefined,
    };
  }
}

export const locationService = new LocationService();