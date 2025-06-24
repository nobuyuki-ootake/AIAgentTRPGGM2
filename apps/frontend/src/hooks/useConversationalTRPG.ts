import { useState, useCallback, useEffect } from 'react';
import { Character, SessionState, ID } from '@ai-agent-trpg/types';
import { aiGameMasterAPI } from '../api/aiGameMaster';
import { useNotification } from './useNotification';
import { useRecoilValue } from 'recoil';
import { aiProviderAtom, aiModelAtom } from '../store/atoms';

interface ConversationalTRPGState {
  isProcessing: boolean;
  awaitingDiceRoll: boolean;
  currentChallenge?: {
    description: string;
    difficulty: number;
    modifiers: string[];
  };
  processedDiceMessageId?: ID;
}

export const useConversationalTRPG = (
  sessionId: ID,
  _campaignId: ID,
  playerCharacter: Character | null,
  sessionState: SessionState,
  characters: Character[],
  onSendMessage: (message: string, type: 'ic' | 'ooc', characterId?: string) => void,
  onRollDice?: (dice: string, purpose: string, characterId?: string) => void
) => {
  const [state, setState] = useState<ConversationalTRPGState>({
    isProcessing: false,
    awaitingDiceRoll: false,
  });

  const { showError, showInfo } = useNotification();
  const aiProvider = useRecoilValue(aiProviderAtom);
  const aiModel = useRecoilValue(aiModelAtom);

  // プレイヤーのメッセージを処理
  const processPlayerMessage = useCallback(async (message: string) => {
    if (!playerCharacter || state.isProcessing) return;

    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      // アクションキーワードを検出
      const actionKeywords = ['攻撃', '調査', '調べる', '探す', '説得', '交渉', '隠れる', '忍び寄る', 'ジャンプ', '登る'];
      const needsCheck = actionKeywords.some(keyword => message.includes(keyword));

      if (needsCheck) {
        // 簡易的な難易度設定（実際にはAIが判断）
        const baseDifficulty = 15;
        const modifierDescriptions: string[] = [];

        // チャレンジ情報を保存
        setState(prev => ({
          ...prev,
          awaitingDiceRoll: true,
          currentChallenge: {
            description: `「${message}」を試みます`,
            difficulty: baseDifficulty,
            modifiers: modifierDescriptions,
          },
        }));

        // GMからのチャレンジ説明をチャットに送信
        const challengeMessage = `【チャレンジ】「${message}」を試みます\n` +
          `難易度: ${baseDifficulty}\n` +
          `d20でロールしてください。`;

        onSendMessage(challengeMessage, 'ic', 'gm');

        // ダイスロールを促す
        if (onRollDice) {
          showInfo('ダイスロールが必要です。ダイスボタンをクリックしてください。');
        }
      } else {
        // チェック不要な場合は、GMの応答を生成
        const sessionContext = {
          currentSession: sessionState,
          characters: characters.map(c => ({
            id: c.id,
            name: c.name,
            role: c.characterType,
          })),
          activeQuests: [],
          completedMilestones: [],
          recentEvents: [],
          campaignTension: 50,
          playerEngagement: 70,
          storyProgression: 30,
          difficulty: 'medium',
          mood: 'neutral',
        };

        await aiGameMasterAPI.generatePlayerActionResponse({
          sessionId,
          playerCharacterId: playerCharacter.id,
          playerAction: message,
          sessionContext,
          provider: aiProvider,
          model: aiModel,
        });
      }
    } catch (error) {
      console.error('Failed to process player message:', error);
      showError('メッセージの処理に失敗しました。もう一度お試しください。');
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [
    playerCharacter,
    state.isProcessing,
    sessionId,
    sessionState,
    characters,
    aiProvider,
    aiModel,
    onSendMessage,
    onRollDice,
    showError,
    showInfo,
  ]);

  // ダイスロール結果を処理（文字列から数値を抽出）
  const processDiceRoll = useCallback(async (total: number, _dice: string) => {
    if (!state.awaitingDiceRoll || !playerCharacter) {
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true, awaitingDiceRoll: false }));

    try {
      const difficulty = state.currentChallenge?.difficulty || 15;
      const success = total >= difficulty;

      // 結果のナラティブを簡易生成（実際にはAIが生成）
      const narrative = success
        ? `見事な成功です！${playerCharacter.name}の行動は期待通りの結果をもたらしました。`
        : `残念ながら失敗しました。${playerCharacter.name}の試みは思うような結果を得られませんでした。`;

      // 結果をチャットに送信
      const resultMessage = `【結果】${success ? '成功！' : '失敗...'}\n` +
        `ロール: ${total} vs 難易度 ${difficulty}\n\n` +
        narrative;

      onSendMessage(resultMessage, 'ic', 'gm');

      // ステートをリセット
      setState({
        isProcessing: false,
        awaitingDiceRoll: false,
      });
    } catch (error) {
      console.error('Failed to process dice roll:', error);
      showError('ダイスロール結果の処理に失敗しました。');
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [
    state.awaitingDiceRoll,
    state.currentChallenge,
    playerCharacter,
    onSendMessage,
    showError,
  ]);

  // ダイスロールのキャンセル
  const cancelDiceRoll = useCallback(() => {
    setState(prev => ({
      ...prev,
      awaitingDiceRoll: false,
      currentChallenge: undefined,
    }));
    showInfo('チャレンジがキャンセルされました。');
  }, [showInfo]);

  // チャットログを監視してダイスロール結果を検出
  useEffect(() => {
    if (!state.awaitingDiceRoll || !playerCharacter) return;

    // 最新のダイスロールメッセージをチェック
    const latestDiceMessage = sessionState.chatLog
      .filter(msg => msg.type === 'dice' && msg.characterId === playerCharacter.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (latestDiceMessage) {
      // ダイスロールメッセージから結果を抽出
      const match = latestDiceMessage.message.match(/結果: (\d+)/);
      if (match) {
        const total = parseInt(match[1]);
        const diceMatch = latestDiceMessage.message.match(/(\d+d\d+(?:[+-]\d+)?)/);
        const dice = diceMatch ? diceMatch[1] : '1d20';
        
        // 一度処理したメッセージは再処理しない
        if (!state.processedDiceMessageId || state.processedDiceMessageId !== latestDiceMessage.id) {
          setState(prev => ({ ...prev, processedDiceMessageId: latestDiceMessage.id }));
          processDiceRoll(total, dice);
        }
      }
    }
  }, [sessionState.chatLog, state.awaitingDiceRoll, playerCharacter, state.processedDiceMessageId, processDiceRoll]);

  return {
    processPlayerMessage,
    processDiceRoll,
    cancelDiceRoll,
    isProcessing: state.isProcessing,
    awaitingDiceRoll: state.awaitingDiceRoll,
    currentChallenge: state.currentChallenge,
  };
};