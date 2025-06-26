/**
 * Entity Relationship Graph Manager
 * エンティティ間関連性・依存関係管理システム
 */

import { 
  EntityRelationshipGraph, 
  EntityRelationship, 
  ID
} from '../../../../../packages/types/src/index';

export interface RelationshipAnalysis {
  entityId: ID;
  directRelationships: EntityRelationship[];
  indirectRelationships: EntityRelationship[];
  dependencyChain: ID[];
  circularDependencies: ID[][];
  relationshipScore: number;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface PathfindingResult {
  path: ID[];
  relationshipStrength: number;
  hops: number;
  pathType: 'direct' | 'indirect' | 'complex';
}

export interface GraphMetrics {
  totalNodes: number;
  totalEdges: number;
  averageConnectivity: number;
  stronglyConnectedComponents: ID[][];
  isolatedNodes: ID[];
  hubNodes: { id: ID; connectionCount: number }[];
}

export class RelationshipManager {
  private graph: EntityRelationshipGraph;
  private relationshipCache = new Map<string, RelationshipAnalysis>();
  private pathCache = new Map<string, PathfindingResult>();

  constructor(initialGraph?: EntityRelationshipGraph) {
    this.graph = initialGraph || {
      nodes: [],
      edges: [],
      clusters: [],
      relationships: {},
      analysisMetadata: {
        lastAnalyzed: new Date().toISOString(),
        complexity: 0,
        criticality: {},
        pathOptimization: []
      },
      metadata: {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        totalRelationships: 0
      }
    };
  }

  /**
   * 関係性追加
   */
  addRelationship(relationship: EntityRelationship): void {
    const sourceId = relationship.sourceId;
    
    // Initialize relationships if not present
    if (!this.graph.relationships) {
      this.graph.relationships = {};
    }
    
    if (!this.graph.relationships[sourceId]) {
      this.graph.relationships[sourceId] = [];
    }

    // 既存の関係をチェック
    const existingIndex = this.graph.relationships[sourceId].findIndex(
      r => r.targetId === relationship.targetId && r.type === relationship.type
    );

    if (existingIndex >= 0) {
      // 既存の関係を更新
      this.graph.relationships[sourceId][existingIndex] = relationship;
    } else {
      // 新しい関係を追加
      this.graph.relationships[sourceId].push(relationship);
      if (this.graph.metadata) {
        this.graph.metadata.totalRelationships++;
      }
    }

    this.updateMetadata();
    this.clearRelatedCache(sourceId);
  }

  /**
   * 関係性削除
   */
  removeRelationship(sourceId: ID, targetId: ID, relationshipType?: string): boolean {
    if (!this.graph.relationships) return false;
    
    const relationships = this.graph.relationships[sourceId];
    if (!relationships) return false;

    const initialLength = relationships.length;
    
    this.graph.relationships[sourceId] = relationships.filter(r => {
      const typeMatch = !relationshipType || r.type === relationshipType;
      return !(r.targetId === targetId && typeMatch);
    });

    const removed = initialLength > this.graph.relationships[sourceId].length;
    
    if (removed && this.graph.metadata) {
      this.graph.metadata.totalRelationships--;
      this.updateMetadata();
      this.clearRelatedCache(sourceId);
    }

    return removed;
  }

  /**
   * エンティティの全関係性取得
   */
  getEntityRelationships(entityId: ID, includeIncoming = false): EntityRelationship[] {
    if (!this.graph.relationships) return [];
    
    const outgoing = this.graph.relationships[entityId] || [];
    
    if (!includeIncoming) {
      return outgoing;
    }

    const incoming: EntityRelationship[] = [];
    for (const [sourceId, relationships] of Object.entries(this.graph.relationships)) {
      if (sourceId === entityId) continue;
      
      for (const relationship of relationships) {
        if (relationship.targetId === entityId) {
          incoming.push({
            ...relationship,
            sourceId: sourceId,
            direction: 'unidirectional'
          });
        }
      }
    }

    return [...outgoing, ...incoming];
  }

  /**
   * 関係性分析
   */
  analyzeRelationships(entityId: ID): RelationshipAnalysis {
    const cacheKey = `analysis_${entityId}`;
    const cached = this.relationshipCache.get(cacheKey);
    if (cached) return cached;

    const directRelationships = this.getEntityRelationships(entityId, true);
    const indirectRelationships = this.findIndirectRelationships(entityId, 2);
    const dependencyChain = this.buildDependencyChain(entityId);
    const circularDependencies = this.detectCircularDependencies(entityId);
    const relationshipScore = this.calculateRelationshipScore(entityId);
    const impactLevel = this.determineImpactLevel(relationshipScore, directRelationships.length);

    const analysis: RelationshipAnalysis = {
      entityId,
      directRelationships,
      indirectRelationships,
      dependencyChain,
      circularDependencies,
      relationshipScore,
      impactLevel
    };

    this.relationshipCache.set(cacheKey, analysis);
    return analysis;
  }

  /**
   * エンティティ間のパス検索
   */
  findPath(fromId: ID, toId: ID, maxHops = 5): PathfindingResult | null {
    const cacheKey = `path_${fromId}_${toId}_${maxHops}`;
    const cached = this.pathCache.get(cacheKey);
    if (cached) return cached;

    const result = this.breadthFirstSearch(fromId, toId, maxHops);
    if (result) {
      this.pathCache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * 強い関係性を持つエンティティグループ検出
   */
  findStronglyConnectedGroups(minStrength = 0.7): ID[][] {
    const visited = new Set<ID>();
    const groups: ID[][] = [];

    if (!this.graph.relationships) return groups;

    for (const entityId of Object.keys(this.graph.relationships)) {
      if (visited.has(entityId)) continue;

      const group = this.exploreStrongConnections(entityId, minStrength, visited);
      if (group.length > 1) {
        groups.push(group);
      }
    }

    return groups;
  }

  /**
   * 依存関係チェーン構築
   */
  private buildDependencyChain(entityId: ID): ID[] {
    const chain: ID[] = [];
    const visited = new Set<ID>();
    
    const buildChain = (currentId: ID) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);
      chain.push(currentId);

      if (!this.graph.relationships) return;
      
      const dependencies = this.graph.relationships[currentId]?.filter(
        r => r.type === 'dependency' || r.type === 'prerequisite'
      ) || [];

      for (const dep of dependencies) {
        buildChain(dep.targetId);
      }
    };

    buildChain(entityId);
    return chain;
  }

  /**
   * 循環依存検出
   */
  private detectCircularDependencies(entityId: ID): ID[][] {
    const cycles: ID[][] = [];
    const visited = new Set<ID>();
    const recursionStack = new Set<ID>();

    const detectCycle = (currentId: ID, path: ID[]) => {
      if (recursionStack.has(currentId)) {
        // 循環依存発見
        const cycleStart = path.indexOf(currentId);
        cycles.push(path.slice(cycleStart));
        return;
      }

      if (visited.has(currentId)) return;

      visited.add(currentId);
      recursionStack.add(currentId);

      if (!this.graph.relationships) return;

      const dependencies = this.graph.relationships[currentId]?.filter(
        r => r.type === 'dependency' || r.type === 'prerequisite'
      ) || [];

      for (const dep of dependencies) {
        detectCycle(dep.targetId, [...path, currentId]);
      }

      recursionStack.delete(currentId);
    };

    detectCycle(entityId, []);
    return cycles;
  }

  /**
   * 間接的関係性検索
   */
  private findIndirectRelationships(entityId: ID, maxDepth: number): EntityRelationship[] {
    const indirect: EntityRelationship[] = [];
    const visited = new Set<ID>();

    const searchIndirect = (currentId: ID, depth: number, path: ID[]) => {
      if (depth >= maxDepth || visited.has(currentId)) return;
      visited.add(currentId);

      if (!this.graph.relationships) return;

      const relationships = this.graph.relationships[currentId] || [];
      for (const relationship of relationships) {
        if (relationship.targetId !== entityId && !path.includes(relationship.targetId)) {
          indirect.push({
            ...relationship,
            sourceId: entityId,
            targetId: relationship.targetId,
            strength: relationship.strength * (1 / (depth + 1)), // 距離による減衰
            metadata: {
              ...relationship.metadata,
              isIndirect: true,
              pathLength: depth + 1,
              intermediatePath: path
            }
          });

          searchIndirect(relationship.targetId, depth + 1, [...path, currentId]);
        }
      }
    };

    searchIndirect(entityId, 0, []);
    return indirect;
  }

  /**
   * 関係性スコア計算
   */
  private calculateRelationshipScore(entityId: ID): number {
    const relationships = this.getEntityRelationships(entityId, true);
    
    let score = 0;
    for (const relationship of relationships) {
      let relationshipValue = relationship.strength;

      // 関係タイプによる重み付け
      switch (relationship.type) {
        case 'dependency':
        case 'prerequisite':
          relationshipValue *= 1.5;
          break;
        case 'conflicts':
        case 'mutual_exclusive':
          relationshipValue *= 1.3;
          break;
        case 'enhances':
        case 'synergy':
          relationshipValue *= 1.2;
          break;
        case 'reference':
          relationshipValue *= 0.8;
          break;
      }

      // 方向による重み付け
      if (relationship.direction === 'bidirectional') {
        relationshipValue *= 1.1;
      }

      score += relationshipValue;
    }

    return Math.min(score / Math.max(relationships.length, 1), 1.0);
  }

  /**
   * 影響レベル判定
   */
  private determineImpactLevel(score: number, relationshipCount: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.8 && relationshipCount >= 5) return 'critical';
    if (score >= 0.6 && relationshipCount >= 3) return 'high';
    if (score >= 0.4 || relationshipCount >= 2) return 'medium';
    return 'low';
  }

  /**
   * 幅優先探索によるパス検索
   */
  private breadthFirstSearch(fromId: ID, toId: ID, maxHops: number): PathfindingResult | null {
    if (fromId === toId) {
      return {
        path: [fromId],
        relationshipStrength: 1.0,
        hops: 0,
        pathType: 'direct'
      };
    }

    if (!this.graph.relationships) return null;

    const queue: { id: ID; path: ID[]; strength: number }[] = [
      { id: fromId, path: [fromId], strength: 1.0 }
    ];
    const visited = new Set<ID>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (current.path.length - 1 >= maxHops) continue;
      if (visited.has(current.id)) continue;
      
      visited.add(current.id);

      const relationships = this.graph.relationships[current.id] || [];
      
      for (const relationship of relationships) {
        const targetId = relationship.targetId;
        
        if (targetId === toId) {
          const finalStrength = current.strength * relationship.strength;
          return {
            path: [...current.path, targetId],
            relationshipStrength: finalStrength,
            hops: current.path.length,
            pathType: current.path.length === 1 ? 'direct' : 
                     current.path.length <= 3 ? 'indirect' : 'complex'
          };
        }

        if (!visited.has(targetId) && !current.path.includes(targetId)) {
          queue.push({
            id: targetId,
            path: [...current.path, targetId],
            strength: current.strength * relationship.strength
          });
        }
      }
    }

    return null;
  }

  /**
   * 強い結合探索
   */
  private exploreStrongConnections(startId: ID, minStrength: number, globalVisited: Set<ID>): ID[] {
    const group: ID[] = [];
    const queue: ID[] = [startId];
    const localVisited = new Set<ID>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      
      if (localVisited.has(currentId) || globalVisited.has(currentId)) continue;
      
      localVisited.add(currentId);
      globalVisited.add(currentId);
      group.push(currentId);

      if (!this.graph.relationships) continue;

      const relationships = this.graph.relationships[currentId] || [];
      
      for (const relationship of relationships) {
        if (relationship.strength >= minStrength && !localVisited.has(relationship.targetId)) {
          queue.push(relationship.targetId);
        }
      }
    }

    return group;
  }

  /**
   * グラフメトリクス計算
   */
  calculateGraphMetrics(): GraphMetrics {
    const allNodes = new Set<ID>();
    let totalEdges = 0;

    if (!this.graph.relationships) {
      return {
        totalNodes: 0,
        totalEdges: 0,
        averageConnectivity: 0,
        stronglyConnectedComponents: [],
        isolatedNodes: [],
        hubNodes: []
      };
    }

    // ノードとエッジの計算
    for (const [sourceId, relationships] of Object.entries(this.graph.relationships)) {
      allNodes.add(sourceId);
      totalEdges += relationships.length;
      
      for (const relationship of relationships) {
        allNodes.add(relationship.targetId);
      }
    }

    const totalNodes = allNodes.size;

    // 平均接続性計算
    const averageConnectivity = totalNodes > 0 ? totalEdges / totalNodes : 0;

    // 強結合成分検出
    const stronglyConnectedComponents = this.findStronglyConnectedGroups(0.5);

    // 孤立ノード検出
    const isolatedNodes: ID[] = [];
    for (const nodeId of allNodes) {
      const hasOutgoing = this.graph.relationships[nodeId]?.length > 0;
      const hasIncoming = this.hasIncomingRelationships(nodeId);
      
      if (!hasOutgoing && !hasIncoming) {
        isolatedNodes.push(nodeId);
      }
    }

    // ハブノード検出
    const hubNodes: { id: ID; connectionCount: number }[] = [];
    for (const nodeId of allNodes) {
      const connectionCount = this.getConnectionCount(nodeId);
      if (connectionCount >= 5) { // 5つ以上の接続を持つノードをハブとする
        hubNodes.push({ id: nodeId, connectionCount });
      }
    }
    hubNodes.sort((a, b) => b.connectionCount - a.connectionCount);

    return {
      totalNodes,
      totalEdges,
      averageConnectivity,
      stronglyConnectedComponents,
      isolatedNodes,
      hubNodes
    };
  }

  /**
   * 入力関係の存在チェック
   */
  private hasIncomingRelationships(targetId: ID): boolean {
    if (!this.graph.relationships) return false;

    for (const relationships of Object.values(this.graph.relationships)) {
      if (relationships.some(r => r.targetId === targetId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 接続数計算
   */
  private getConnectionCount(nodeId: ID): number {
    if (!this.graph.relationships) return 0;

    const outgoing = this.graph.relationships[nodeId]?.length || 0;
    let incoming = 0;
    
    for (const relationships of Object.values(this.graph.relationships)) {
      incoming += relationships.filter(r => r.targetId === nodeId).length;
    }
    
    return outgoing + incoming;
  }

  /**
   * メタデータ更新
   */
  private updateMetadata(): void {
    if (this.graph.metadata) {
      this.graph.metadata.lastUpdated = new Date().toISOString();
    }
  }

  /**
   * 関連キャッシュクリア
   */
  private clearRelatedCache(entityId: ID): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.relationshipCache.keys()) {
      if (key.includes(entityId)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.relationshipCache.delete(key);
    }

    // パスキャッシュもクリア
    for (const key of this.pathCache.keys()) {
      if (key.includes(entityId)) {
        this.pathCache.delete(key);
      }
    }
  }

  /**
   * グラフ全体をリセット
   */
  resetGraph(): void {
    this.graph = {
      nodes: [],
      edges: [],
      clusters: [],
      relationships: {},
      analysisMetadata: {
        lastAnalyzed: new Date().toISOString(),
        complexity: 0,
        criticality: {},
        pathOptimization: []
      },
      metadata: {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        totalRelationships: 0
      }
    };
    this.clearAllCaches();
  }

  /**
   * 全キャッシュクリア
   */
  clearAllCaches(): void {
    this.relationshipCache.clear();
    this.pathCache.clear();
  }

  /**
   * グラフデータ取得
   */
  getGraph(): EntityRelationshipGraph {
    return { ...this.graph };
  }

  /**
   * グラフデータ設定
   */
  setGraph(graph: EntityRelationshipGraph): void {
    this.graph = graph;
    this.clearAllCaches();
  }

  /**
   * グラフ統計情報取得
   */
  getStatistics() {
    const totalNodes = this.graph.relationships ? Object.keys(this.graph.relationships).length : 0;
    const totalRelationships = this.graph.metadata?.totalRelationships || 0;

    return {
      totalNodes,
      totalRelationships,
      cacheSize: {
        relationships: this.relationshipCache.size,
        paths: this.pathCache.size
      },
      lastUpdated: this.graph.metadata?.lastUpdated || new Date().toISOString()
    };
  }
}

export const relationshipManager = new RelationshipManager();