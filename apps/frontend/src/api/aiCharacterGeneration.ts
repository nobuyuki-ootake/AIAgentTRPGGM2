import { GameTheme, Character, CharacterType } from '@ai-agent-trpg/types';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || '/api'}/ai-character-generation`;

interface CharacterConcept {
  name: string;
  role: string;
  characterClass: string;
  characterType: CharacterType;
  brief: string;
}

interface GenerateCharactersForThemeRequest {
  campaignId: string;
  theme: GameTheme;
  provider?: string;
}

interface GenerateCharactersForThemeResponse {
  success: boolean;
  characters: Character[];
}

interface GenerateCharacterRequest {
  campaignId: string;
  characterType: CharacterType;
  description: string;
  provider?: string;
}

interface GenerateCharacterResponse {
  success: boolean;
  character: Character;
}

interface GenerateCharacterConceptsRequest {
  theme: GameTheme;
  provider?: string;
}

interface GenerateCharacterConceptsResponse {
  success: boolean;
  concepts: CharacterConcept[];
}

interface GenerateCharacterFromConceptRequest {
  campaignId: string;
  concept: CharacterConcept;
  theme: GameTheme;
  provider?: string;
}

interface GenerateCharacterFromConceptResponse {
  success: boolean;
  character: Character;
}

/**
 * テーマに基づいてキャラクター概要リストを生成（バッチ処理第1ステップ）
 */
export const generateCharacterConcepts = async (
  theme: GameTheme,
  provider: string = 'google'
): Promise<CharacterConcept[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-character-concepts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        theme,
        provider,
      } as GenerateCharacterConceptsRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data: GenerateCharacterConceptsResponse = await response.json();
    
    if (!data.success) {
      throw new Error('AI character concept generation failed');
    }

    return data.concepts;
  } catch (error) {
    console.error('Failed to generate character concepts:', error);
    throw error;
  }
};

/**
 * キャラクター概要から詳細キャラクターを生成（バッチ処理第2ステップ・単体生成共通）
 */
export const generateCharacterFromConcept = async (
  campaignId: string,
  concept: CharacterConcept,
  theme: GameTheme,
  provider: string = 'google'
): Promise<Character> => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-character-from-concept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        campaignId,
        concept,
        theme,
        provider,
      } as GenerateCharacterFromConceptRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data: GenerateCharacterFromConceptResponse = await response.json();
    
    if (!data.success) {
      throw new Error('AI character generation from concept failed');
    }

    return data.character;
  } catch (error) {
    console.error('Failed to generate character from concept:', error);
    throw error;
  }
};

/**
 * バッチ処理でキャラクターを生成（進捗コールバック付き）
 */
export const generateCharactersBatch = async (
  campaignId: string,
  theme: GameTheme,
  provider: string = 'google',
  onProgress?: (current: number, total: number, currentCharacter: string) => void
): Promise<Character[]> => {
  try {
    // ステップ1: キャラクター概要を生成
    onProgress?.(0, 4, 'キャラクター概要を生成中...');
    const concepts = await generateCharacterConcepts(theme, provider);
    
    if (concepts.length === 0) {
      throw new Error('No character concepts generated');
    }

    onProgress?.(1, 4, '概要生成完了');

    // ステップ2: 各キャラクターの詳細を生成
    const characters: Character[] = [];
    for (let i = 0; i < concepts.length; i++) {
      const concept = concepts[i];
      try {
        onProgress?.(i + 1, concepts.length + 1, `${concept.name}の詳細を生成中...`);
        
        const character = await generateCharacterFromConcept(
          campaignId,
          concept,
          theme,
          provider
        );
        
        characters.push(character);
        onProgress?.(i + 2, concepts.length + 1, `${concept.name}生成完了`);
        
        // Rate limiting: 500ms wait between requests
        if (i < concepts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Failed to generate character ${concept.name}:`, error);
        // Continue with other characters instead of failing completely
        onProgress?.(i + 2, concepts.length + 1, `${concept.name}生成失敗（スキップ）`);
      }
    }

    if (characters.length === 0) {
      throw new Error('All character generation attempts failed');
    }

    onProgress?.(concepts.length + 1, concepts.length + 1, 'キャラクター生成完了');
    return characters;
  } catch (error) {
    console.error('Failed to generate characters in batch:', error);
    throw error;
  }
};

/**
 * テーマに基づいてキャラクターを生成（従来方式）
 */
export const generateCharactersForTheme = async (
  campaignId: string,
  theme: GameTheme,
  provider: string = 'google',
): Promise<Character[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-characters-for-theme`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        campaignId,
        theme,
        provider,
      } as GenerateCharactersForThemeRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data: GenerateCharactersForThemeResponse = await response.json();
    
    if (!data.success) {
      throw new Error('AI character generation failed');
    }

    return data.characters;
  } catch (error) {
    console.error('Failed to generate characters for theme:', error);
    throw error;
  }
};

/**
 * 単一キャラクターをAI生成
 */
export const generateSingleCharacter = async (
  campaignId: string,
  characterType: CharacterType,
  description: string,
  provider: string = 'google',
): Promise<Character> => {
  try {
    const requestData = {
      campaignId,
      characterType,
      description,
      provider,
    } as GenerateCharacterRequest;

    console.log('=== Frontend: Sending character generation request ===');
    console.log('URL:', `${API_BASE_URL}/generate-character`);
    console.log('Request data:', requestData);

    const response = await fetch(`${API_BASE_URL}/generate-character`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (!response.ok) {
      console.error('Response not ok:', response.status, response.statusText);
      const errorData = await response.json().catch(() => ({}));
      console.error('Error data from server:', errorData);
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data: GenerateCharacterResponse = await response.json();
    console.log('Response data:', data);
    
    if (!data.success) {
      console.error('Server reported failure:', data);
      throw new Error('AI character generation failed');
    }

    console.log('Character generation successful');
    return data.character;
  } catch (error) {
    console.error('=== Frontend: Character generation error ===');
    console.error('Error:', error);
    console.error('Request data that caused error:', {
      campaignId,
      characterType,
      description,
      provider
    });
    throw error;
  }
};

export type { CharacterConcept };

export const aiCharacterGenerationAPI = {
  generateCharactersForTheme,
  generateSingleCharacter,
  generateCharacterConcepts,
  generateCharacterFromConcept,
  generateCharactersBatch,
};