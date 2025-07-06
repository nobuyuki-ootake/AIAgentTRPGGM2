/**
 * Entity Relationship Graph Manager
 * エンティティ間関連性・依存関係管理システム
 */

import { 
  EntityRelationshipGraph, 
  EntityRelationship, 
  ID
} from '@ai-agent-trpg/types';

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
      relationships: {},
      metadata: {
        totalNodes: 0,
        totalEdges: 0,
        lastUpdated: new Date().toISOString(),
        validationStatus: 'valid'
      }
    };
  }

  /**
   * 関係性追加
   */
  addRelationship(relationship: EntityRelationship): void {
    const sourceId = relationship.sourceEntityId;
    
    // Initialize relationships if not present
    if (!this.graph.relationships) {
      this.graph.relationships = {};
    }
    
    if (!this.graph.relationships[sourceId]) {
      this.graph.relationships[sourceId] = [];
    }
    
    // Add the relationship if it doesn't already exist
    const exists = this.graph.relationships[sourceId].some(
      rel => rel.targetEntityId === relationship.targetEntityId && 
             rel.relationType === relationship.relationType
    );
    
    if (!exists) {
      this.graph.relationships[sourceId].push(relationship);
      this.graph.metadata.totalEdges++;
      
      // Update node count
      const allNodeIds = new Set<ID>();
      Object.keys(this.graph.relationships).forEach(id => allNodeIds.add(id));
      Object.values(this.graph.relationships).forEach(rels => {
        rels.forEach(rel => allNodeIds.add(rel.targetEntityId));
      });
      this.graph.metadata.totalNodes = allNodeIds.size;
    }
    
    // Clear caches
    this.clearCaches();
    
    // Update metadata
    this.graph.metadata.lastUpdated = new Date().toISOString();
  }

  /**
   * 関係性削除
   */
  removeRelationship(sourceId: ID, targetId: ID, relationType?: string): void {
    if (!this.graph.relationships[sourceId]) return;
    
    const prevLength = this.graph.relationships[sourceId].length;
    this.graph.relationships[sourceId] = this.graph.relationships[sourceId].filter(
      rel => !(rel.targetEntityId === targetId && 
              (!relationType || rel.relationType === relationType))
    );
    
    const removedCount = prevLength - this.graph.relationships[sourceId].length;
    this.graph.metadata.totalEdges -= removedCount;
    
    // Clean up empty arrays
    if (this.graph.relationships[sourceId].length === 0) {
      delete this.graph.relationships[sourceId];
    }
    
    // Update node count
    const allNodeIds = new Set<ID>();
    Object.keys(this.graph.relationships).forEach(id => allNodeIds.add(id));
    Object.values(this.graph.relationships).forEach(rels => {
      rels.forEach(rel => allNodeIds.add(rel.targetEntityId));
    });
    this.graph.metadata.totalNodes = allNodeIds.size;
    
    this.clearCaches();
    this.graph.metadata.lastUpdated = new Date().toISOString();
  }

  /**
   * 関係性分析
   */
  analyzeRelationships(entityId: ID): RelationshipAnalysis {
    // Check cache
    const cached = this.relationshipCache.get(entityId);
    if (cached) return cached;
    
    const directRelationships = this.getDirectRelationships(entityId);
    const indirectRelationships = this.findIndirectRelationships(entityId);
    const dependencyChain = this.buildDependencyChain(entityId);
    const circularDependencies = this.findCircularDependencies(entityId);
    
    const analysis: RelationshipAnalysis = {
      entityId,
      directRelationships,
      indirectRelationships,
      dependencyChain,
      circularDependencies,
      relationshipScore: this.calculateRelationshipScore(entityId),
      impactLevel: this.determineImpactLevel(entityId)
    };
    
    this.relationshipCache.set(entityId, analysis);
    return analysis;
  }

  /**
   * 直接関係性取得
   */
  private getDirectRelationships(entityId: ID): EntityRelationship[] {
    const outgoing = this.graph.relationships[entityId] || [];
    const incoming: EntityRelationship[] = [];
    
    // Find incoming relationships
    Object.entries(this.graph.relationships).forEach(([sourceId, rels]) => {
      rels.forEach(rel => {
        if (rel.targetEntityId === entityId) {
          incoming.push({
            ...rel,
            sourceEntityId: entityId,
            targetEntityId: sourceId,
            metadata: {
              ...rel.metadata,
              createdAt: rel.metadata?.createdAt || new Date().toISOString(),
              validationCount: rel.metadata?.validationCount || 0
            }
          });
        }
      });
    });
    
    return [...outgoing, ...incoming];
  }

  /**
   * 関係性グラフ構築
   */
  buildRelationshipGraph(centerEntityId: ID, depth: number = 2): EntityRelationshipGraph {
    const visitedNodes = new Set<ID>();
    const subgraph: EntityRelationshipGraph = {
      relationships: {},
      metadata: {
        totalNodes: 0,
        totalEdges: 0,
        lastUpdated: new Date().toISOString(),
        validationStatus: 'valid'
      }
    };
    
    const explore = (entityId: ID, currentDepth: number) => {
      if (currentDepth > depth || visitedNodes.has(entityId)) return;
      visitedNodes.add(entityId);
      
      const relationships = this.getDirectRelationships(entityId);
      if (relationships.length > 0) {
        subgraph.relationships[entityId] = relationships;
        subgraph.metadata.totalEdges += relationships.length;
        
        relationships.forEach(rel => {
          explore(rel.targetEntityId, currentDepth + 1);
        });
      }
    };
    
    explore(centerEntityId, 0);
    subgraph.metadata.totalNodes = visitedNodes.size;
    
    return subgraph;
  }

  /**
   * パスファインディング
   */
  findPath(sourceId: ID, targetId: ID): PathfindingResult | null {
    const cacheKey = `${sourceId}->${targetId}`;
    const cached = this.pathCache.get(cacheKey);
    if (cached) return cached;
    
    const visited = new Set<ID>();
    const queue: { id: ID; path: ID[]; strength: number }[] = [
      { id: sourceId, path: [sourceId], strength: 1 }
    ];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (current.id === targetId) {
        const result: PathfindingResult = {
          path: current.path,
          relationshipStrength: current.strength,
          hops: current.path.length - 1,
          pathType: current.path.length === 2 ? 'direct' : 
                   current.path.length <= 4 ? 'indirect' : 'complex'
        };
        this.pathCache.set(cacheKey, result);
        return result;
      }
      
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      
      const relationships = this.graph.relationships[current.id] || [];
      relationships.forEach(rel => {
        if (!visited.has(rel.targetEntityId)) {
          queue.push({
            id: rel.targetEntityId,
            path: [...current.path, rel.targetEntityId],
            strength: current.strength * rel.strength
          });
        }
      });
    }
    
    return null;
  }

  /**
   * 間接関係性検出
   */
  private findIndirectRelationships(entityId: ID, maxDepth: number = 3): EntityRelationship[] {
    const indirectRels: EntityRelationship[] = [];
    const visited = new Set<ID>();
    
    const traverse = (currentId: ID, depth: number, path: ID[]) => {
      if (depth > maxDepth || visited.has(currentId)) return;
      visited.add(currentId);
      
      const relationships = this.graph.relationships[currentId] || [];
      relationships.forEach(rel => {
        if (depth > 0 && rel.targetEntityId !== entityId) {
          const targetEntity = rel.targetEntityId;
          if (!path.includes(targetEntity)) {
            const indirectRel: EntityRelationship = {
              id: `indirect-${entityId}-${targetEntity}`,
              sourceEntityId: entityId,
              targetEntityId: targetEntity,
              relationType: 'sequence',
              strength: rel.strength * Math.pow(0.8, depth),
              bidirectional: false,
              metadata: {
                description: `Indirect relationship through ${path.length} entities`,
                createdAt: new Date().toISOString(),
                validationCount: 0
              }
            };
            indirectRels.push(indirectRel);
          }
          traverse(targetEntity, depth + 1, [...path, targetEntity]);
        }
      });
    };
    
    traverse(entityId, 0, [entityId]);
    return indirectRels;
  }

  /**
   * 依存関係チェーン構築
   */
  private buildDependencyChain(entityId: ID): ID[] {
    const chain: ID[] = [entityId];
    const visited = new Set<ID>([entityId]);
    
    const findDependencies = (currentId: ID) => {
      const relationships = this.graph.relationships[currentId] || [];
      const dependencies = relationships.filter(
        rel => rel.relationType === 'dependency' || rel.relationType === 'prerequisite'
      );
      
      dependencies.forEach(dep => {
        if (!visited.has(dep.targetEntityId)) {
          visited.add(dep.targetEntityId);
          chain.push(dep.targetEntityId);
          findDependencies(dep.targetEntityId);
        }
      });
    };
    
    findDependencies(entityId);
    return chain;
  }

  /**
   * 循環依存検出
   */
  private findCircularDependencies(entityId: ID): ID[][] {
    const cycles: ID[][] = [];
    const visited = new Set<ID>();
    const recStack = new Set<ID>();
    const path: ID[] = [];
    
    const dfs = (currentId: ID): boolean => {
      visited.add(currentId);
      recStack.add(currentId);
      path.push(currentId);
      
      const relationships = this.graph.relationships[currentId] || [];
      for (const rel of relationships) {
        if (rel.relationType === 'dependency' || rel.relationType === 'prerequisite') {
          const targetId = rel.targetEntityId;
          
          if (!visited.has(targetId)) {
            if (dfs(targetId)) {
              return true;
            }
          } else if (recStack.has(targetId)) {
            // Found a cycle
            const cycleStart = path.indexOf(targetId);
            if (cycleStart !== -1) {
              cycles.push(path.slice(cycleStart).concat(targetId));
            }
          }
        }
      }
      
      path.pop();
      recStack.delete(currentId);
      return false;
    };
    
    dfs(entityId);
    return cycles;
  }

  /**
   * グラフメトリクス計算
   */
  calculateGraphMetrics(): GraphMetrics {
    const nodeIds = new Set<ID>();
    let totalEdges = 0;
    
    // Collect all nodes and edges
    Object.entries(this.graph.relationships).forEach(([sourceId, rels]) => {
      nodeIds.add(sourceId);
      rels.forEach(rel => {
        nodeIds.add(rel.targetEntityId);
        totalEdges++;
      });
    });
    
    const totalNodes = nodeIds.size;
    const averageConnectivity = totalNodes > 0 ? totalEdges / totalNodes : 0;
    
    // Find strongly connected components using Tarjan's algorithm
    const stronglyConnectedComponents = this.findStronglyConnectedComponents();
    
    // Find isolated nodes
    const isolatedNodes = Array.from(nodeIds).filter(id => {
      const hasOutgoing = !!this.graph.relationships[id]?.length;
      const hasIncoming = Object.values(this.graph.relationships).some(
        rels => rels.some(rel => rel.targetEntityId === id)
      );
      return !hasOutgoing && !hasIncoming;
    });
    
    // Find hub nodes
    const connectionCounts = new Map<ID, number>();
    nodeIds.forEach(id => {
      const outgoing = this.graph.relationships[id]?.length || 0;
      const incoming = Object.values(this.graph.relationships).filter(
        rels => rels.some(rel => rel.targetEntityId === id)
      ).length;
      connectionCounts.set(id, outgoing + incoming);
    });
    
    const hubNodes = Array.from(connectionCounts.entries())
      .map(([id, count]) => ({ id, connectionCount: count }))
      .filter(node => node.connectionCount > averageConnectivity * 2)
      .sort((a, b) => b.connectionCount - a.connectionCount);
    
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
   * 強連結成分検出
   */
  private findStronglyConnectedComponents(): ID[][] {
    const components: ID[][] = [];
    const stack: ID[] = [];
    const lowlinks = new Map<ID, number>();
    const indices = new Map<ID, number>();
    const onStack = new Set<ID>();
    let index = 0;
    
    const strongconnect = (v: ID) => {
      indices.set(v, index);
      lowlinks.set(v, index);
      index++;
      stack.push(v);
      onStack.add(v);
      
      const relationships = this.graph.relationships[v] || [];
      relationships.forEach(rel => {
        const w = rel.targetEntityId;
        if (!indices.has(w)) {
          strongconnect(w);
          lowlinks.set(v, Math.min(lowlinks.get(v)!, lowlinks.get(w)!));
        } else if (onStack.has(w)) {
          lowlinks.set(v, Math.min(lowlinks.get(v)!, indices.get(w)!));
        }
      });
      
      if (lowlinks.get(v) === indices.get(v)) {
        const component: ID[] = [];
        let w: ID;
        do {
          w = stack.pop()!;
          onStack.delete(w);
          component.push(w);
        } while (w !== v);
        
        if (component.length > 1) {
          components.push(component);
        }
      }
    };
    
    // Get all nodes
    const allNodes = new Set<ID>();
    Object.keys(this.graph.relationships).forEach(id => allNodes.add(id));
    Object.values(this.graph.relationships).forEach(rels => {
      rels.forEach(rel => allNodes.add(rel.targetEntityId));
    });
    
    allNodes.forEach(node => {
      if (!indices.has(node)) {
        strongconnect(node);
      }
    });
    
    return components;
  }

  /**
   * 関係性スコア計算
   */
  private calculateRelationshipScore(entityId: ID): number {
    const directRels = this.getDirectRelationships(entityId);
    const incomingCount = directRels.filter(
      rel => rel.targetEntityId === entityId
    ).length;
    const outgoingCount = directRels.filter(
      rel => rel.sourceEntityId === entityId
    ).length;
    
    const strengthSum = directRels.reduce((sum, rel) => sum + rel.strength, 0);
    const avgStrength = directRels.length > 0 ? strengthSum / directRels.length : 0;
    
    // Score based on connectivity and strength
    const connectivityScore = Math.min((incomingCount + outgoingCount) / 10, 1);
    const strengthScore = avgStrength;
    
    return (connectivityScore + strengthScore) / 2;
  }

  /**
   * 影響レベル判定
   */
  private determineImpactLevel(entityId: ID): 'low' | 'medium' | 'high' | 'critical' {
    const score = this.calculateRelationshipScore(entityId);
    const dependencies = this.buildDependencyChain(entityId);
    const metrics = this.calculateGraphMetrics();
    const isHub = metrics.hubNodes.some(hub => hub.id === entityId);
    
    if (isHub || dependencies.length > 10) return 'critical';
    if (score > 0.7 || dependencies.length > 5) return 'high';
    if (score > 0.4 || dependencies.length > 2) return 'medium';
    return 'low';
  }

  /**
   * キャッシュクリア
   */
  private clearCaches(): void {
    this.relationshipCache.clear();
    this.pathCache.clear();
  }

  /**
   * グラフエクスポート
   */
  exportGraph(): EntityRelationshipGraph {
    return JSON.parse(JSON.stringify(this.graph));
  }

  /**
   * グラフインポート
   */
  importGraph(graph: EntityRelationshipGraph): void {
    this.graph = JSON.parse(JSON.stringify(graph));
    this.clearCaches();
  }

  /**
   * グラフ妥当性検証
   */
  validateGraph(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for self-references
    Object.entries(this.graph.relationships).forEach(([sourceId, rels]) => {
      rels.forEach(rel => {
        if (rel.sourceEntityId === rel.targetEntityId) {
          errors.push(`Self-reference detected: ${sourceId}`);
        }
      });
    });
    
    // Check for duplicate relationships
    Object.entries(this.graph.relationships).forEach(([sourceId, rels]) => {
      const seen = new Set<string>();
      rels.forEach(rel => {
        const key = `${rel.targetEntityId}-${rel.relationType}`;
        if (seen.has(key)) {
          errors.push(`Duplicate relationship: ${sourceId} -> ${rel.targetEntityId} (${rel.relationType})`);
        }
        seen.add(key);
      });
    });
    
    // Update validation status
    this.graph.metadata.validationStatus = errors.length === 0 ? 'valid' : 'invalid';
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}