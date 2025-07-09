import { useState, useCallback } from 'react';
import { InitializationStage } from '../components/trpg-session/SessionInitializationModal';

export interface UseSessionInitializationReturn {
  stages: InitializationStage[];
  currentStage: number;
  overallProgress: number;
  isInitializing: boolean;
  error: string | null;
  startInitialization: () => void;
  updateStage: (stageId: string, updates: Partial<InitializationStage>) => void;
  nextStage: () => void;
  completeInitialization: () => void;
  failInitialization: (error: string) => void;
  resetInitialization: () => void;
}

const INITIAL_STAGES: InitializationStage[] = [
  {
    id: 'entities',
    title: '🎯 エンティティプール生成',
    description: 'エネミー、NPC、アイテム、イベントを生成しています...',
    status: 'pending',
    progress: 0,
  },
  {
    id: 'milestones',
    title: '🏁 マイルストーン生成',
    description: 'キャンペーンの目標と達成条件を設定しています...',
    status: 'pending',
    progress: 0,
  },
  {
    id: 'overview',
    title: '📜 ゲーム概要生成',
    description: 'セッションの状況と導入シーンを準備しています...',
    status: 'pending',
    progress: 0,
  },
];

export const useSessionInitialization = (): UseSessionInitializationReturn => {
  const [stages, setStages] = useState<InitializationStage[]>(INITIAL_STAGES);
  const [currentStage, setCurrentStage] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateOverallProgress = useCallback((stagesList: InitializationStage[]) => {
    const totalStages = stagesList.length;
    const completedStages = stagesList.filter(stage => stage.status === 'completed').length;
    const currentStageProgress = stagesList.find(stage => stage.status === 'in_progress')?.progress || 0;
    
    return ((completedStages * 100) + currentStageProgress) / totalStages;
  }, []);

  const overallProgress = calculateOverallProgress(stages);

  const startInitialization = useCallback(() => {
    setIsInitializing(true);
    setError(null);
    setCurrentStage(0);
    setStages(INITIAL_STAGES.map((stage, index) => ({
      ...stage,
      status: index === 0 ? 'in_progress' : 'pending',
      progress: index === 0 ? 0 : undefined,
      error: undefined,
      details: undefined,
    })));
  }, []);

  const updateStage = useCallback((stageId: string, updates: Partial<InitializationStage>) => {
    setStages(prevStages => 
      prevStages.map(stage => 
        stage.id === stageId 
          ? { ...stage, ...updates }
          : stage
      )
    );
  }, []);

  const nextStage = useCallback(() => {
    setStages(prevStages => {
      const newStages = [...prevStages];
      const currentStageIndex = newStages.findIndex(stage => stage.status === 'in_progress');
      
      if (currentStageIndex !== -1) {
        // 現在のステージを完了にする
        newStages[currentStageIndex] = {
          ...newStages[currentStageIndex],
          status: 'completed',
          progress: 100,
        };
        
        // 次のステージがあれば開始する
        if (currentStageIndex + 1 < newStages.length) {
          newStages[currentStageIndex + 1] = {
            ...newStages[currentStageIndex + 1],
            status: 'in_progress',
            progress: 0,
          };
          setCurrentStage(currentStageIndex + 1);
        }
      }
      
      return newStages;
    });
  }, []);

  const completeInitialization = useCallback(() => {
    setStages(prevStages => 
      prevStages.map(stage => ({
        ...stage,
        status: 'completed',
        progress: 100,
      }))
    );
    setIsInitializing(false);
    setError(null);
  }, []);

  const failInitialization = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setStages(prevStages => 
      prevStages.map(stage => 
        stage.status === 'in_progress' 
          ? { ...stage, status: 'error', error: errorMessage }
          : stage
      )
    );
    setIsInitializing(false);
  }, []);

  const resetInitialization = useCallback(() => {
    setStages(INITIAL_STAGES);
    setCurrentStage(0);
    setIsInitializing(false);
    setError(null);
  }, []);

  return {
    stages,
    currentStage,
    overallProgress,
    isInitializing,
    error,
    startInitialization,
    updateStage,
    nextStage,
    completeInitialization,
    failInitialization,
    resetInitialization,
  };
};