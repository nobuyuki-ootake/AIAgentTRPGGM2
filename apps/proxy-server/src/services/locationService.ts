import { 
  Location, 
  LocationMovement, 
  LocationInteraction, 
  LocationQuery, 
  Character,
  TRPGEvent,
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

class LocationService {
  // ==========================================
  // 場所管理
  // ==========================================

  async getLocations(query?: LocationQuery): Promise<PaginatedResponse<Location>> {
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
      sql += ' AND JSON_EXTRACT(discovery, "$.isKnown") = ?';
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
    const now = new Date().toISOString();

    const location: Location = {
      id,
      name: data.name,
      description: data.description,
      type: data.type,
      parentLocationId: data.parentLocationId,
      childLocationIds: [],
      coordinates: data.coordinates,
      connections: [],
      environment: data.environment,
      presentEntities: {
        characters: [],
        npcs: [],
        enemies: [],
        events: [],
        items: [],
        structures: [],
      },
      access: {
        isPublic: true,
        requiredPermissions: [],
        restrictedGroups: [],
        ...data.access,
      },
      properties: {
        isRestArea: false,
        hasShops: false,
        hasTeleporter: false,
        isSecret: false,
        isDangerous: false,
        magicLevel: 'none',
        sanctity: 'neutral',
        ...data.properties,
      },
      discovery: {
        isKnown: !data.properties?.isSecret,
        isExplored: false,
        explorationLevel: 0,
      },
      gameplay: {
        encounterRate: 0.1,
        lootSpawnRate: 0.05,
        experienceModifier: 1.0,
        difficultyModifier: 1.0,
        stealthModifier: 0,
      },
      aiData: data.aiData,
      createdAt: now,
      updatedAt: now,
      visitCount: 0,
    };

    database.prepare(`
      INSERT INTO locations (
        id, name, description, type, parent_location_id, child_location_ids,
        coordinates, connections, environment, present_entities, access,
        properties, discovery, gameplay, ai_data, created_at, updated_at, visit_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      location.id,
      location.name,
      location.description,
      location.type,
      location.parentLocationId,
      JSON.stringify(location.childLocationIds),
      JSON.stringify(location.coordinates),
      JSON.stringify(location.connections),
      JSON.stringify(location.environment),
      JSON.stringify(location.presentEntities),
      JSON.stringify(location.access),
      JSON.stringify(location.properties),
      JSON.stringify(location.discovery),
      JSON.stringify(location.gameplay),
      JSON.stringify(location.aiData),
      location.createdAt,
      location.updatedAt,
      location.visitCount
    );

    // 親場所の子リストを更新
    if (location.parentLocationId) {
      await this.addChildLocation(location.parentLocationId, location.id);
    }

    return location;
  }

  async updateLocation(id: ID, updates: Partial<Location>): Promise<Location | null> {
    const existingLocation = await this.getLocationById(id);
    if (!existingLocation) return null;

    const updatedLocation: Location = {
      ...existingLocation,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    database.prepare(`
      UPDATE locations SET
        name = ?, description = ?, type = ?, parent_location_id = ?,
        child_location_ids = ?, coordinates = ?, connections = ?,
        environment = ?, present_entities = ?, access = ?, properties = ?,
        discovery = ?, gameplay = ?, ai_data = ?, updated_at = ?, visit_count = ?
      WHERE id = ?
    `).run(
      updatedLocation.name,
      updatedLocation.description,
      updatedLocation.type,
      updatedLocation.parentLocationId,
      JSON.stringify(updatedLocation.childLocationIds),
      JSON.stringify(updatedLocation.coordinates),
      JSON.stringify(updatedLocation.connections),
      JSON.stringify(updatedLocation.environment),
      JSON.stringify(updatedLocation.presentEntities),
      JSON.stringify(updatedLocation.access),
      JSON.stringify(updatedLocation.properties),
      JSON.stringify(updatedLocation.discovery),
      JSON.stringify(updatedLocation.gameplay),
      JSON.stringify(updatedLocation.aiData),
      updatedLocation.updatedAt,
      updatedLocation.visitCount,
      id
    );

    return updatedLocation;
  }

  async deleteLocation(id: ID): Promise<boolean> {
    const location = await this.getLocationById(id);
    if (!location) return false;

    // 子場所の親IDを解除
    for (const childId of location.childLocationIds) {
      await this.updateLocation(childId, { parentLocationId: undefined });
    }

    // 親場所の子リストから削除
    if (location.parentLocationId) {
      await this.removeChildLocation(location.parentLocationId, id);
    }

    const result = database.prepare('DELETE FROM locations WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // ==========================================
  // キャラクター位置管理
  // ==========================================

  async moveCharacter(data: MoveCharacterData): Promise<LocationMovement> {
    const character = await this.getCharacterById(data.characterId);
    if (!character) {
      throw new Error(`Character ${data.characterId} not found`);
    }

    const fromLocationId = character.currentLocationId;
    if (!fromLocationId) {
      throw new Error('Character has no current location');
    }

    const toLocation = await this.getLocationById(data.toLocationId);
    if (!toLocation) {
      throw new Error(`Location ${data.toLocationId} not found`);
    }

    // 移動可能性をチェック
    const canMove = await this.canCharacterMoveTo(data.characterId, data.toLocationId);
    if (!canMove.allowed) {
      throw new Error(`Movement denied: ${canMove.reason}`);
    }

    const movementId = uuidv4();
    const now = new Date().toISOString();
    const estimatedDuration = data.estimatedDuration || this.calculateTravelTime(fromLocationId, data.toLocationId);

    const movement: LocationMovement = {
      id: movementId,
      characterId: data.characterId,
      fromLocationId,
      toLocationId: data.toLocationId,
      startTime: now,
      estimatedDuration,
      movementType: data.movementType || 'walk',
      transportMethod: data.transportMethod,
      status: 'traveling',
      travelEvents: [],
      costs: this.calculateMovementCosts(fromLocationId, data.toLocationId, data.movementType || 'walk'),
      companions: data.companions || [],
      createdAt: now,
      updatedAt: now,
    };

    // 移動記録を保存
    database.prepare(`
      INSERT INTO location_movements (
        id, character_id, from_location_id, to_location_id, start_time,
        estimated_duration, movement_type, transport_method, status,
        travel_events, costs, companions, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      movement.id,
      movement.characterId,
      movement.fromLocationId,
      movement.toLocationId,
      movement.startTime,
      movement.estimatedDuration,
      movement.movementType,
      movement.transportMethod,
      movement.status,
      JSON.stringify(movement.travelEvents),
      JSON.stringify(movement.costs),
      JSON.stringify(movement.companions),
      movement.createdAt,
      movement.updatedAt
    );

    // 即座に移動完了（リアルタイム移動として）
    await this.completeMovement(movementId);

    return movement;
  }

  async completeMovement(movementId: ID): Promise<LocationMovement | null> {
    const movement = await this.getMovementById(movementId);
    if (!movement || movement.status !== 'traveling') return null;

    const now = new Date().toISOString();
    
    // 移動記録を更新
    database.prepare(`
      UPDATE location_movements SET
        status = 'completed', end_time = ?, actual_duration = ?, updated_at = ?
      WHERE id = ?
    `).run(
      now,
      Math.floor((Date.now() - new Date(movement.startTime).getTime()) / 60000), // 分単位
      now,
      movementId
    );

    // キャラクターの現在位置を更新
    await this.updateCharacterLocation(movement.characterId, movement.toLocationId);

    // 場所のエンティティを更新
    await this.updateLocationEntities(movement.fromLocationId, 'characters', movement.characterId, 'remove');
    await this.updateLocationEntities(movement.toLocationId, 'characters', movement.characterId, 'add');

    // 同行者も移動
    for (const companionId of movement.companions) {
      await this.updateCharacterLocation(companionId, movement.toLocationId);
      await this.updateLocationEntities(movement.fromLocationId, 'characters', companionId, 'remove');
      await this.updateLocationEntities(movement.toLocationId, 'characters', companionId, 'add');
    }

    return await this.getMovementById(movementId);
  }

  // ==========================================
  // 場所での相互作用
  // ==========================================

  async createLocationInteraction(
    locationId: ID,
    characterId: ID,
    interactionType: LocationInteraction['interactionType'],
    details: LocationInteraction['details'],
    context: LocationInteraction['context']
  ): Promise<LocationInteraction> {
    const interactionId = uuidv4();
    const now = new Date().toISOString();

    const interaction: LocationInteraction = {
      id: interactionId,
      locationId,
      characterId,
      interactionType,
      details,
      context,
      effects: {},
      timestamp: now,
    };

    database.prepare(`
      INSERT INTO location_interactions (
        id, location_id, character_id, interaction_type, details,
        context, effects, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      interaction.id,
      interaction.locationId,
      interaction.characterId,
      interaction.interactionType,
      JSON.stringify(interaction.details),
      JSON.stringify(interaction.context),
      JSON.stringify(interaction.effects),
      interaction.timestamp
    );

    // 相互作用の効果を適用
    await this.applyInteractionEffects(interaction);

    return interaction;
  }

  async getLocationInteractions(
    locationId: ID,
    characterId?: ID,
    interactionType?: LocationInteraction['interactionType']
  ): Promise<LocationInteraction[]> {
    let sql = 'SELECT * FROM location_interactions WHERE location_id = ?';
    const params = [locationId];

    if (characterId) {
      sql += ' AND character_id = ?';
      params.push(characterId);
    }

    if (interactionType) {
      sql += ' AND interaction_type = ?';
      params.push(interactionType);
    }

    sql += ' ORDER BY timestamp DESC';

    const rows = database.prepare(sql).all(...params) as any[];
    return rows.map(this.rowToLocationInteraction);
  }

  // ==========================================
  // 場所検索と関係性
  // ==========================================

  async getCharactersInLocation(locationId: ID): Promise<Character[]> {
    const location = await this.getLocationById(locationId);
    if (!location) return [];

    const characterIds = [
      ...location.presentEntities.characters,
      ...location.presentEntities.npcs,
      ...location.presentEntities.enemies,
    ];

    const characters: Character[] = [];
    for (const characterId of characterIds) {
      const character = await this.getCharacterById(characterId);
      if (character) {
        characters.push(character);
      }
    }

    return characters;
  }

  async getEventsInLocation(locationId: ID): Promise<TRPGEvent[]> {
    const rows = database.prepare(
      'SELECT * FROM events WHERE location_id = ? ORDER BY scheduled_date ASC'
    ).all(locationId) as any[];

    return rows.map(this.rowToEvent);
  }

  async getConnectedLocations(locationId: ID): Promise<Location[]> {
    const location = await this.getLocationById(locationId);
    if (!location) return [];

    const connectedIds = location.connections.map(conn => conn.locationId);
    const locations: Location[] = [];

    for (const id of connectedIds) {
      const connectedLocation = await this.getLocationById(id);
      if (connectedLocation) {
        locations.push(connectedLocation);
      }
    }

    return locations;
  }

  async findNearbyLocations(locationId: ID, maxDistance: number = 5): Promise<Location[]> {
    // 簡単な実装：接続されている場所から再帰的に探索
    const visited = new Set<ID>();
    const nearby: Location[] = [];

    const explore = async (currentId: ID, distance: number) => {
      if (distance >= maxDistance || visited.has(currentId)) return;
      
      visited.add(currentId);
      const location = await this.getLocationById(currentId);
      if (!location) return;

      if (distance > 0) {
        nearby.push(location);
      }

      for (const connection of location.connections) {
        await explore(connection.locationId, distance + 1);
      }
    };

    await explore(locationId, 0);
    return nearby;
  }

  // ==========================================
  // ユーティリティメソッド
  // ==========================================

  private async canCharacterMoveTo(characterId: ID, toLocationId: ID): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const character = await this.getCharacterById(characterId);
    const location = await this.getLocationById(toLocationId);

    if (!character || !location) {
      return { allowed: false, reason: 'Character or location not found' };
    }

    // アクセス権限チェック
    if (!location.access.isPublic) {
      // 権限チェックのロジック（実装は後で拡張）
      return { allowed: false, reason: 'Access denied' };
    }

    return { allowed: true };
  }

  private calculateTravelTime(_fromLocationId: ID, _toLocationId: ID): number {
    // 簡易計算：基本30分、後で詳細化
    return 30;
  }

  private calculateMovementCosts(
    _fromLocationId: ID, 
    _toLocationId: ID, 
    movementType: LocationMovement['movementType']
  ): LocationMovement['costs'] {
    // 簡易計算
    const baseCost = movementType === 'run' ? 20 : 10;
    return {
      energy: baseCost,
      currency: 0,
      resources: [],
    };
  }

  private async updateCharacterLocation(characterId: ID, newLocationId: ID): Promise<void> {
    const now = new Date().toISOString();
    
    database.prepare(`
      UPDATE characters SET
        current_location_id = ?, updated_at = ?
      WHERE id = ?
    `).run(newLocationId, now, characterId);

    // ロケーション履歴を追加
    const character = await this.getCharacterById(characterId);
    if (character) {
      const locationHistory = character.locationHistory || [];
      
      // 最後のエントリを完了
      if (locationHistory.length > 0) {
        const lastEntry = locationHistory[locationHistory.length - 1];
        if (!lastEntry.leftAt) {
          lastEntry.leftAt = now;
        }
      }
      
      // 新しいエントリを追加
      locationHistory.push({
        locationId: newLocationId,
        enteredAt: now,
      });

      database.prepare(`
        UPDATE characters SET location_history = ? WHERE id = ?
      `).run(JSON.stringify(locationHistory), characterId);
    }
  }

  private async updateLocationEntities(
    locationId: ID,
    entityType: keyof Location['presentEntities'],
    entityId: ID,
    action: 'add' | 'remove'
  ): Promise<void> {
    const location = await this.getLocationById(locationId);
    if (!location) return;

    const entities = location.presentEntities[entityType] as ID[];
    
    if (action === 'add' && !entities.includes(entityId)) {
      entities.push(entityId);
    } else if (action === 'remove') {
      const index = entities.indexOf(entityId);
      if (index > -1) {
        entities.splice(index, 1);
      }
    }

    location.presentEntities[entityType] = entities;
    await this.updateLocation(locationId, { presentEntities: location.presentEntities });
  }

  private async addChildLocation(parentId: ID, childId: ID): Promise<void> {
    const parent = await this.getLocationById(parentId);
    if (parent && !parent.childLocationIds.includes(childId)) {
      parent.childLocationIds.push(childId);
      await this.updateLocation(parentId, { childLocationIds: parent.childLocationIds });
    }
  }

  private async removeChildLocation(parentId: ID, childId: ID): Promise<void> {
    const parent = await this.getLocationById(parentId);
    if (parent) {
      parent.childLocationIds = parent.childLocationIds.filter(id => id !== childId);
      await this.updateLocation(parentId, { childLocationIds: parent.childLocationIds });
    }
  }

  private async applyInteractionEffects(interaction: LocationInteraction): Promise<void> {
    // 相互作用の効果を適用（実装は使用ケースに応じて拡張）
    console.log('Applying interaction effects:', interaction);
  }

  // ==========================================
  // データ変換メソッド
  // ==========================================

  private rowToLocation(row: any): Location {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      parentLocationId: row.parent_location_id,
      childLocationIds: row.child_location_ids ? JSON.parse(row.child_location_ids) : [],
      coordinates: row.coordinates ? JSON.parse(row.coordinates) : undefined,
      connections: row.connections ? JSON.parse(row.connections) : [],
      environment: JSON.parse(row.environment),
      presentEntities: JSON.parse(row.present_entities),
      access: JSON.parse(row.access),
      properties: JSON.parse(row.properties),
      discovery: JSON.parse(row.discovery),
      gameplay: JSON.parse(row.gameplay),
      aiData: row.ai_data ? JSON.parse(row.ai_data) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastVisited: row.last_visited,
      visitCount: row.visit_count,
    };
  }

  private rowToLocationInteraction(row: any): LocationInteraction {
    return {
      id: row.id,
      locationId: row.location_id,
      characterId: row.character_id,
      interactionType: row.interaction_type,
      details: JSON.parse(row.details),
      context: JSON.parse(row.context),
      effects: JSON.parse(row.effects),
      timestamp: row.timestamp,
    };
  }

  private async getMovementById(id: ID): Promise<LocationMovement | null> {
    const row = database.prepare('SELECT * FROM location_movements WHERE id = ?').get(id) as any;
    return row ? this.rowToLocationMovement(row) : null;
  }

  private rowToLocationMovement(row: any): LocationMovement {
    return {
      id: row.id,
      characterId: row.character_id,
      fromLocationId: row.from_location_id,
      toLocationId: row.to_location_id,
      startTime: row.start_time,
      endTime: row.end_time,
      estimatedDuration: row.estimated_duration,
      actualDuration: row.actual_duration,
      movementType: row.movement_type,
      transportMethod: row.transport_method,
      status: row.status,
      interruption: row.interruption ? JSON.parse(row.interruption) : undefined,
      travelEvents: JSON.parse(row.travel_events),
      costs: JSON.parse(row.costs),
      companions: JSON.parse(row.companions),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // 外部サービスとの統合用メソッド（簡易実装）
  private async getCharacterById(id: ID): Promise<Character | null> {
    const row = database.prepare('SELECT * FROM characters WHERE id = ?').get(id) as any;
    if (!row) return null;
    
    // 簡易キャラクター変換（実際は characterService を使用）
    return {
      id: row.id,
      currentLocationId: row.current_location_id,
      locationHistory: row.location_history ? JSON.parse(row.location_history) : [],
      // 他のフィールドは省略...
    } as Character;
  }

  private rowToEvent(row: any): TRPGEvent {
    // 簡易イベント変換（実際は eventService を使用）
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      locationId: row.location_id,
      // 他のフィールドは省略...
    } as TRPGEvent;
  }
}

export const locationService = new LocationService();