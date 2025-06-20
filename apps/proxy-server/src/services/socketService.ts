import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';
import { TRPGCharacter, ID, ChatMessage } from '@ai-agent-trpg/types';

/**
 * WebSocket companion autonomous action service
 * 仲間キャラクターの自律行動システム
 */
export class SocketService {
  private io: SocketIOServer | null = null;

  /**
   * Socket.IOインスタンスを設定
   */
  setSocketIO(io: SocketIOServer): void {
    this.io = io;
    logger.info('SocketService initialized with Socket.IO server');
  }

  /**
   * セッションの状況を分析し、仲間キャラクターの反応が必要かを判定
   * @param sessionId セッションID
   * @param playerAction プレイヤーの行動内容
   * @param sessionContext セッションの文脈情報
   * @param companions 仲間キャラクターリスト
   */
  async analyzeAndReact(
    sessionId: ID,
    playerAction: {
      type: 'dice_roll' | 'chat' | 'combat_action' | 'movement' | 'item_use';
      result?: 'success' | 'failure' | 'partial';
      content: string;
      character?: TRPGCharacter;
    },
    sessionContext: {
      currentLocation?: string;
      recentEvents: string[];
      sessionMode: 'exploration' | 'combat' | 'social' | 'rest';
      dangerLevel: 'low' | 'medium' | 'high';
    },
    companions: TRPGCharacter[]
  ): Promise<void> {
    if (!this.io) {
      logger.warn('Socket.IO not initialized, skipping companion reaction');
      return;
    }

    try {
      // 1. 状況分析：仲間反応が必要かを判定
      const shouldReact = this.shouldCompanionsReact(playerAction, sessionContext);
      
      if (!shouldReact) {
        logger.debug(`No companion reaction needed for action: ${playerAction.type}`);
        return;
      }

      // 2. 反応するキャラクターを選択
      const reactingCharacter = this.selectReactingCharacter(
        playerAction, 
        sessionContext, 
        companions
      );

      if (!reactingCharacter) {
        logger.debug('No suitable companion found for reaction');
        return;
      }

      // 3. キャラクター固有の反応メッセージを生成
      const reactionMessage = this.generateCompanionReaction(
        reactingCharacter,
        playerAction,
        sessionContext
      );

      // 4. WebSocketでリアルタイム配信
      await this.broadcastCompanionMessage(sessionId, reactionMessage);

      logger.info(`Companion ${reactingCharacter.name} reacted to player action in session ${sessionId}`);

    } catch (error) {
      logger.error('Error in companion reaction analysis:', error);
    }
  }

  /**
   * 仲間が反応すべき状況かを判定
   */
  private shouldCompanionsReact(
    playerAction: any,
    sessionContext: any
  ): boolean {
    // 成功/失敗連続時
    if (playerAction.result === 'failure' && sessionContext.recentEvents.filter(e => e.includes('失敗')).length >= 2) {
      return true;
    }

    // 危険レベルが高い時
    if (sessionContext.dangerLevel === 'high') {
      return true;
    }

    // 戦闘中の重要な行動
    if (sessionContext.sessionMode === 'combat' && playerAction.type === 'combat_action') {
      return true;
    }

    // 探索中の発見
    if (sessionContext.sessionMode === 'exploration' && playerAction.result === 'success') {
      return Math.random() < 0.4; // 40%の確率で反応
    }

    return false;
  }

  /**
   * 状況に最適な仲間キャラクターを選択
   */
  private selectReactingCharacter(
    playerAction: any,
    sessionContext: any,
    companions: TRPGCharacter[]
  ): TRPGCharacter | null {
    const availableCompanions = companions.filter(c => 
      c.characterType === 'companion' && c.isActive
    );

    if (availableCompanions.length === 0) {
      return null;
    }

    // 状況に応じたキャラクター選択ロジック
    if (sessionContext.sessionMode === 'combat') {
      // 戦闘時は戦士を優先
      const warrior = availableCompanions.find(c => 
        c.characterClass?.toLowerCase().includes('fighter') || 
        c.characterClass?.toLowerCase().includes('warrior') ||
        c.name?.toLowerCase().includes('alex')
      );
      if (warrior) return warrior;
    }

    if (sessionContext.sessionMode === 'exploration') {
      // 探索時は盗賊を優先
      const rogue = availableCompanions.find(c => 
        c.characterClass?.toLowerCase().includes('rogue') || 
        c.characterClass?.toLowerCase().includes('thief') ||
        c.name?.toLowerCase().includes('lina')
      );
      if (rogue) return rogue;
    }

    if (playerAction.result === 'failure') {
      // 失敗時は魔法使いを優先
      const mage = availableCompanions.find(c => 
        c.characterClass?.toLowerCase().includes('wizard') || 
        c.characterClass?.toLowerCase().includes('mage') ||
        c.name?.toLowerCase().includes('elfin')
      );
      if (mage) return mage;
    }

    // デフォルトはランダム選択
    return availableCompanions[Math.floor(Math.random() * availableCompanions.length)];
  }

  /**
   * キャラクター固有の反応メッセージを生成
   */
  private generateCompanionReaction(
    character: TRPGCharacter,
    playerAction: any,
    sessionContext: any
  ): ChatMessage {
    const characterName = character.name || 'Unknown';
    const characterClass = character.characterClass?.toLowerCase() || '';
    
    let reactionText = '';

    // 職業に基づく反応パターン
    if (characterClass.includes('fighter') || characterClass.includes('warrior') || characterName.toLowerCase().includes('alex')) {
      // 戦士の反応
      if (sessionContext.dangerLevel === 'high') {
        reactionText = '警戒しろ！危険な気配がする。俺が前に出よう。';
      } else if (playerAction.result === 'success') {
        reactionText = 'いい動きだ！その調子で行こう。';
      } else if (playerAction.result === 'failure') {
        reactionText = '大丈夫だ、まだ諦めるな。俺たちがいる。';
      } else {
        reactionText = '何か手伝えることはあるか？';
      }
    } else if (characterClass.includes('wizard') || characterClass.includes('mage') || characterName.toLowerCase().includes('elfin')) {
      // エルフィン（魔法使い）の反応
      if (sessionContext.sessionMode === 'exploration') {
        reactionText = 'この場所には古い魔法の痕跡があるわね。慎重に調べましょう。';
      } else if (playerAction.result === 'failure') {
        reactionText = '別の方法を考えてみましょう。魔法で何とかできるかもしれません。';
      } else if (sessionContext.dangerLevel === 'high') {
        reactionText = '魔法的な防御を準備しておくわ。何が起きても対応できるように。';
      } else {
        reactionText = '知識が必要でしたら遠慮なく聞いてくださいね。';
      }
    } else if (characterClass.includes('rogue') || characterClass.includes('thief') || characterName.toLowerCase().includes('lina')) {
      // ライナ（盗賊）の反応
      if (sessionContext.sessionMode === 'exploration') {
        reactionText = 'ちょっと待って、隠し扉がありそうな気がする。調べてみる？';
      } else if (playerAction.result === 'failure') {
        reactionText = 'うまくいかなかったね。別のルートを探してみよう。';
      } else if (sessionContext.dangerLevel === 'high') {
        reactionText = '何か変な感じがする...後ろを確認したほうがいいかも。';
      } else {
        reactionText = '何か面白いものは見つかった？';
      }
    } else {
      // 汎用反応
      if (playerAction.result === 'success') {
        reactionText = 'よくやったね！';
      } else if (playerAction.result === 'failure') {
        reactionText = '大丈夫、きっと次はうまくいくよ。';
      } else {
        reactionText = '一緒に頑張ろう！';
      }
    }

    return {
      id: `companion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sessionId: sessionContext.sessionId || '',
      speaker: characterName,
      content: reactionText,
      type: 'ic', // In-character
      timestamp: new Date().toISOString(),
      characterId: character.id
    };
  }

  /**
   * WebSocketで仲間メッセージをリアルタイム配信
   */
  private async broadcastCompanionMessage(
    sessionId: ID,
    message: ChatMessage
  ): Promise<void> {
    if (!this.io) {
      throw new Error('Socket.IO not initialized');
    }

    // セッション参加者全員にメッセージを配信
    this.io.to(`session-${sessionId}`).emit('companion-message', {
      type: 'companion_reaction',
      message,
      timestamp: new Date().toISOString()
    });

    logger.debug(`Broadcasted companion message from ${message.speaker} to session ${sessionId}`);
  }

  /**
   * プレイヤー行動をWebSocketで監視トリガー
   */
  async triggerPlayerActionAnalysis(
    sessionId: ID,
    actionData: any
  ): Promise<void> {
    if (!this.io) {
      logger.warn('Socket.IO not initialized, skipping action analysis trigger');
      return;
    }

    // 他のクライアントに行動通知（必要に応じて）
    this.io.to(`session-${sessionId}`).emit('player-action', {
      type: 'action_performed',
      sessionId,
      actionData,
      timestamp: new Date().toISOString()
    });

    logger.debug(`Triggered player action analysis for session ${sessionId}`);
  }
}

// シングルトンインスタンス
export const socketService = new SocketService();