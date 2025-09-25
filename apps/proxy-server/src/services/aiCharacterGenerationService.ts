import { GameTheme, TRPGCharacter, Character, CharacterType, BaseStats, DerivedStats } from '@ai-agent-trpg/types';
import { getAIService } from './aiService';
import { v4 as uuidv4 } from 'uuid';

interface CharacterGenerationPrompt {
  theme: GameTheme;
  characterType: CharacterType;
  role?: string;
}

interface CharacterConcept {
  name: string;
  role: string;
  characterClass: string;
  characterType: CharacterType;
  brief: string;
}

interface AICharacterResponse {
  name: string;
  characterClass: string;
  description: string;
  background: string;
  personality: string;
  alignment: string;
  baseStats: BaseStats;
  level: number;
  maxHitPoints: number;
  maxMagicPoints: number;
}

class AICharacterGenerationService {
  /**
   * テーマに基づいてキャラクター概要リストを生成（バッチ処理用）
   */
  async generateCharacterConcepts(
    theme: GameTheme,
    options: { provider?: string } = {}
  ): Promise<CharacterConcept[]> {
    const { provider = 'google' } = options;

    const prompt = this.buildCharacterConceptPrompt(theme);
    
    try {
      const aiService = getAIService();
      
      // 環境変数からAPIキーを取得
      let apiKey = '';
      if (provider === 'google') {
        apiKey = process.env.GOOGLE_API_KEY || '';
      } else if (provider === 'openai') {
        apiKey = process.env.OPENAI_API_KEY || '';
      } else if (provider === 'anthropic') {
        apiKey = process.env.ANTHROPIC_API_KEY || '';
      }

      if (!apiKey) {
        throw new Error(`API key for provider ${provider} is not configured`);
      }
      
      const response = await aiService.generateCharacter({
        provider,
        apiKey,
        characterType: 'PC',
        characterBasics: { prompt },
        campaignContext: {},
      });

      return this.parseCharacterConcepts(response.characterData);
    } catch (error) {
      console.error('AI character concept generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`AI character concept generation failed: ${errorMessage}. Please check your AI provider configuration and try again.`);
    }
  }

  /**
   * テーマに基づいて複数のキャラクターを生成（従来のバッチ処理）
   */
  async generateCharactersForTheme(
    campaignId: string,
    theme: GameTheme,
    options: { provider?: string } = {}
  ): Promise<Character[]> {
    const characters: Character[] = [];
    
    // 生成するキャラクタータイプを定義（プレイヤー選択用に全てPC）
    const characterTypes: { type: CharacterType; role: string }[] = [
      { type: 'PC', role: '勇敢な戦士タイプ。剣と盾で前線に立ち、仲間を守る' },
      { type: 'PC', role: '知恵豊かな魔法使いタイプ。魔法と知識で冒険をサポート' },
      { type: 'PC', role: '身軽な盗賊タイプ。技と素早さで危険を回避し、宝を見つける' },
    ];

    for (const { type, role } of characterTypes) {
      try {
        const character = await this.generateSingleCharacterForRole(
          campaignId,
          theme,
          type,
          role,
          options
        );
        characters.push(character);
        
        // Wait briefly between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to generate ${type} character with role ${role}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`AI character generation failed for ${type} character: ${errorMessage}`);
      }
    }

    if (characters.length === 0) {
      throw new Error('AI character generation completely failed. Please check your AI provider settings and try again.');
    }

    return characters;
  }

  /**
   * キャラクター概要から詳細キャラクターを生成（バッチ・単体共通）
   */
  async generateCharacterFromConcept(
    campaignId: string,
    concept: CharacterConcept,
    theme: GameTheme,
    options: { provider?: string } = {}
  ): Promise<Character> {
    const prompt = this.buildCharacterDetailPrompt(concept, theme);

    const aiResponse = await this.callAIForCharacterGeneration(prompt, concept.characterType, options);
    return this.createCharacterFromAIResponse(campaignId, concept.characterType, aiResponse);
  }

  /**
   * 単一キャラクターをAI生成
   */
  async generateSingleCharacter(
    campaignId: string,
    characterType: CharacterType,
    description: string,
    options: { provider?: string } = {}
  ): Promise<Character> {
    const prompt = this.buildCharacterGenerationPrompt({
      theme: {
        id: 'custom',
        name: 'カスタム',
        description,
        genre: 'custom',
        setting: description,
        mood: 'dramatic',
        difficulty: 'normal',
        style: 'balanced',
        keyElements: [description]
      },
      characterType,
    });

    const aiResponse = await this.callAIForCharacterGeneration(prompt, characterType, options);
    return this.createCharacterFromAIResponse(campaignId, characterType, aiResponse);
  }

  /**
   * 役割指定でキャラクターを生成
   */
  private async generateSingleCharacterForRole(
    campaignId: string,
    theme: GameTheme,
    characterType: CharacterType,
    role: string,
    options: { provider?: string } = {}
  ): Promise<Character> {
    const prompt = this.buildCharacterGenerationPrompt({
      theme,
      characterType,
      role,
    });

    const aiResponse = await this.callAIForCharacterGeneration(prompt, characterType, options);
    return this.createCharacterFromAIResponse(campaignId, characterType, aiResponse);
  }

  /**
   * AI API呼び出し
   */
  private async callAIForCharacterGeneration(
    prompt: string,
    characterType: CharacterType,
    options: { provider?: string } = {}
  ): Promise<AICharacterResponse> {
    const { provider = 'google' } = options;

    try {
      const aiService = getAIService();
      
      // 環境変数からAPIキーを取得
      let apiKey = '';
      if (provider === 'google') {
        apiKey = process.env.GOOGLE_API_KEY || '';
      } else if (provider === 'openai') {
        apiKey = process.env.OPENAI_API_KEY || '';
      } else if (provider === 'anthropic') {
        apiKey = process.env.ANTHROPIC_API_KEY || '';
      }

      if (!apiKey) {
        throw new Error(`API key for provider ${provider} is not configured`);
      }
      
      const response = await aiService.generateCharacter({
        provider,
        apiKey,
        characterType: characterType as 'PC' | 'NPC' | 'Enemy',
        characterBasics: { prompt },
        campaignContext: {},
      });

      return this.parseAICharacterResponse(response.characterData);
    } catch (error) {
      console.error('AI character generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`AI character generation failed: ${errorMessage}. Please check your AI provider configuration and try again.`);
    }
  }

  /**
   * キャラクター生成プロンプト構築
   */
  private buildCharacterGenerationPrompt({ theme, characterType, role }: CharacterGenerationPrompt): string {
    const basePrompt = `
あなたはTRPGキャラクター生成の専門家です。以下の設定に基づいて、魅力的なキャラクターを1体生成してください。

## テーマ設定
- ジャンル: ${theme.genre || 'fantasy'}
- 世界観: ${theme.description}
- 雰囲気: ${theme.mood || 'balanced'}
- 難易度: ${"balanced"}
- スタイル: ${"standard"}
${theme.keyElements ? `- 重要要素: ${theme.keyElements.join(', ')}` : ''}

## キャラクター要件
- タイプ: ${characterType}
${role ? `- 役割: ${role}` : ''}

## 出力形式（JSON）
**必ず以下の形式に厳密に従ってください。追加のフィールドや構造を含めないでください：**

\`\`\`json
{
  "name": "[テーマに適したユニークな名前]",
  "characterClass": "[指定された職業]",
  "description": "外見や特徴の詳細な説明（100文字程度）",
  "background": "背景設定や経歴（100文字程度）",
  "personality": "性格や行動傾向（100文字程度）",
  "alignment": "秩序にして善",
  "baseStats": {
    "strength": 16,
    "dexterity": 12,
    "constitution": 14,
    "intelligence": 10,
    "wisdom": 11,
    "charisma": 13
  },
  "level": 1,
  "maxHitPoints": 40,
  "maxMagicPoints": 0
}
\`\`\`

## 重要な注意事項
- **上記のJSON形式を厳密に守ってください**
- **追加のフィールドや入れ子構造（traits, flaws, ideals等）を含めないでください**
- **数値は範囲ではなく具体的な数値を入れてください**
- **JSONの構文エラーがないよう注意してください**

## 注意事項
- ${characterType === 'PC' ? 'プレイヤーが操作する主人公' : characterType === 'NPC' ? '協力的な仲間キャラクター' : '敵対的なキャラクター'}として設計してください
- **キャラクター名は${theme.genre}テーマに適したユニークな名前**を使用してください
  - クラシックファンタジー: カタカナ表記の西洋風の名前（創造的で多様な組み合わせで）
  - 和風ファンタジー: 日本語名（創造的で多様な組み合わせで）
  - SF: 未来的な名前（創造的で多様な組み合わせで）
  - 現代: 現代的な名前（創造的で多様な組み合わせで）
- **毎回まったく異なる名前を考案してください**
- テーマの${theme.genre}ジャンルに適した日本語の名前と設定にしてください
- ステータスは${"balanced"}難易度に適したバランスにしてください
- **JSON内で二重引用符を使用する場合は必ずエスケープ（\\"）してください**
- すべて日本語で回答してください
`;

    return basePrompt.trim();
  }

  /**
   * キャラクター概要プロンプト構築（バッチ処理用）
   */
  private buildCharacterConceptPrompt(theme: GameTheme): string {
    // ランダム性を高めるためのタイムスタンプとランダムシード
    const randomSeed = Math.floor(Math.random() * 1000000);
    const timestamp = Date.now();
    
    const conceptPrompt = `
あなたはTRPGキャラクター企画の専門家です。以下のテーマに基づいて、3体のキャラクター概要を生成してください。

[ランダムシード: ${randomSeed}, タイムスタンプ: ${timestamp}]
**重要: 毎回まったく異なるユニークなキャラクター名を考案してください。過去に生成した名前は一切使用しないでください。**

## テーマ設定
- ジャンル: ${theme.genre || 'fantasy'}
- 世界観: ${theme.description}
- 設定: ${theme.setting || theme.name}
- 雰囲気: ${theme.mood || 'balanced'}
- 難易度: ${theme.difficulty || 'normal'}
- スタイル: ${theme.style || 'balanced'}
${theme.keyElements ? `- 重要要素: ${theme.keyElements.join(', ')}` : ''}

## 生成要件
1つ目: プレイヤーキャラクター（戦士・前衛タイプ）
2つ目: プレイヤーキャラクター（魔法使い・後衛タイプ）
3つ目: プレイヤーキャラクター（技能・支援タイプ）

## 出力形式（JSON）
以下のJSON形式で回答してください。**毎回異なるユニークな名前**を生成してください：

\`\`\`json
{
  "characters": [
    {
      "name": "[${theme.genre}テーマに適したユニークな名前1]",
      "role": "勇敢な戦士タイプ。剣と盾で前線に立ち、仲間を守る",
      "characterClass": "戦士",
      "characterType": "PC",
      "brief": "勇敢で頼りになる前衛戦士"
    },
    {
      "name": "[${theme.genre}テーマに適したユニークな名前2]",
      "role": "知恵豊かな魔法使いタイプ。魔法と知識で冒険をサポート",
      "characterClass": "魔法使い",
      "characterType": "PC",
      "brief": "聡明で魔法に長けた後衛"
    },
    {
      "name": "[${theme.genre}テーマに適したユニークな名前3]",
      "role": "身軽な盗賊タイプ。技と素早さで危険を回避し、宝を見つける",
      "characterClass": "盗賊",
      "characterType": "PC",
      "brief": "機敏で器用な技能特化型"
    }
  ]
}
\`\`\`

## 重要: 名前生成要件
- **毎回完全に異なるユニークなキャラクター名を生成**してください
- **決して同じ名前を再利用しないでください**
- **キャラクター名は${theme.genre}テーマに適した多様な名前**を使用してください
  - クラシックファンタジー: カタカナ表記の西洋風の名前（多様な組み合わせで）
  - 和風ファンタジー: 日本語名（多様な組み合わせで）
  - SF: 未来的な名前（多様な組み合わせで）
  - 現代: 現代的な名前（多様な組み合わせで）
- **創造性を発揮して、毎回新しい名前を考案してください**

## その他の注意事項  
- ${theme.genre}ジャンルに適した名前と職業を設定してください
- 3つの異なるプレイスタイル（戦士系、魔法系、技能系）のキャラクターを作成してください
- **全てのキャラクターは "characterType": "PC" として生成してください**（プレイヤー選択用）
- プレイヤーが選択しやすいよう、明確に特徴を分けてください
- 簡潔で分かりやすい概要にしてください
- **JSON内で二重引用符を使用する場合は必ずエスケープ（\\"）してください**
- JSONの構文エラーがないよう十分注意してください
`;

    return conceptPrompt.trim();
  }

  /**
   * キャラクター詳細プロンプト構築（概要から詳細生成用）
   */
  private buildCharacterDetailPrompt(concept: CharacterConcept, theme: GameTheme): string {
    const detailPrompt = `
あなたはTRPGキャラクター詳細設計の専門家です。以下の概要に基づいて、詳細なキャラクターを1体生成してください。

## テーマ設定
- ジャンル: ${theme.genre || 'fantasy'}
- 世界観: ${theme.description}
- 雰囲気: ${theme.mood || 'balanced'}
- 難易度: ${"balanced"}
- スタイル: ${"standard"}
${theme.keyElements ? `- 重要要素: ${theme.keyElements.join(', ')}` : ''}

## キャラクター概要
- 名前: ${concept.name}
- 職業: ${concept.characterClass}
- 役割: ${concept.role}
- タイプ: ${concept.characterType}
- 概要: ${concept.brief}

## 出力形式（JSON）
以下のJSON形式で詳細キャラクターを回答してください：

\`\`\`json
{
  "name": "${concept.name}",
  "characterClass": "${concept.characterClass}",
  "description": "外見や特徴の詳細な説明（100文字程度）",
  "background": "背景設定や経歴（100文字程度）",
  "personality": "性格や行動傾向（100文字程度）",
  "alignment": "善/中立/悪の属性",
  "baseStats": {
    "strength": 10-18,
    "dexterity": 10-18,
    "constitution": 10-18,
    "intelligence": 10-18,
    "wisdom": 10-18,
    "charisma": 10-18
  },
  "level": 1-5,
  "maxHitPoints": 20-80,
  "maxMagicPoints": 10-50
}
\`\`\`

## 注意事項
- 指定された日本語名前と職業を必ず使用してください
- ${concept.role}としての特徴を反映してください
- ${theme.genre}ジャンルに適した日本語の設定にしてください
- ステータスは${"balanced"}難易度に適したバランスにしてください
- **JSON内で二重引用符を使用する場合は必ずエスケープ（\\"）してください**
- すべて日本語で回答してください
- JSONの構文エラーがないよう十分注意してください
`;

    return detailPrompt.trim();
  }

  /**
   * AI応答をパース
   */
  private parseAICharacterResponse(response: string): AICharacterResponse {
    console.log('🚨 PARSE AI CHARACTER RESPONSE CALLED');
    try {
      console.log('Raw AI response length:', response.length);
      console.log('Raw AI response (first 500 chars):', response.substring(0, 500));
      console.log('Raw AI response (last 500 chars):', response.substring(Math.max(0, response.length - 500)));
      
      // JSONブロックを抽出
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        console.log('No JSON block found. Trying alternative extraction...');
        // 代替方法: { で始まり } で終わる最初のJSONオブジェクトを探す
        const jsonStart = response.indexOf('{');
        const jsonEnd = response.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const extractedJson = response.substring(jsonStart, jsonEnd + 1);
          console.log('Extracted JSON (first 200 chars):', extractedJson.substring(0, 200));
          const jsonData = JSON.parse(extractedJson);
          return this.processCharacterData(jsonData);
        }
        throw new Error('JSON format not found in AI response');
      }

      console.log('Found JSON block (first 200 chars):', jsonMatch[1].substring(0, 200));
      console.log('Raw JSON block length:', jsonMatch[1].length);
      
      // JSONをクリーニング
      const cleanedJson = this.cleanJsonString(jsonMatch[1]);
      console.log('Cleaned JSON (first 200 chars):', cleanedJson.substring(0, 200));
      console.log('Cleaned JSON length:', cleanedJson.length);
      
      try {
        const jsonData = JSON.parse(cleanedJson);
        return this.processCharacterData(jsonData);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.log('FULL CLEANED JSON FOR DEBUGGING:', cleanedJson);
        // Show character at error position if available
        if (parseError instanceof SyntaxError && parseError.message.includes('position')) {
          const positionMatch = parseError.message.match(/position (\d+)/);
          if (positionMatch) {
            const position = parseInt(positionMatch[1]);
            const contextStart = Math.max(0, position - 50);
            const contextEnd = Math.min(cleanedJson.length, position + 50);
            const context = cleanedJson.substring(contextStart, contextEnd);
            console.log(`Error context (around position ${position}):`, context);
            console.log(`Character at error position: '${cleanedJson[position]}' (charCode: ${cleanedJson.charCodeAt(position)})`);
          }
        }
        throw parseError;
      }
    } catch (error) {
      console.error('Failed to parse AI character response:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse AI character response: ${errorMessage}. The AI response may be malformed.`);
    }
  }

  /**
   * AI応答からキャラクター概要リストをパース
   */
  private parseCharacterConcepts(response: string): CharacterConcept[] {
    try {
      console.log('Raw AI concept response length:', response.length);
      console.log('Raw AI concept response (first 500 chars):', response.substring(0, 500));
      console.log('Raw AI concept response (last 500 chars):', response.substring(Math.max(0, response.length - 500)));
      
      // JSONブロックを抽出
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        console.log('No JSON block found. Trying alternative extraction...');
        // 代替方法: { で始まり } で終わる最初のJSONオブジェクトを探す
        const jsonStart = response.indexOf('{');
        const jsonEnd = response.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const extractedJson = response.substring(jsonStart, jsonEnd + 1);
          console.log('Extracted concept JSON length:', extractedJson.length);
          console.log('Extracted concept JSON (full):', extractedJson);
          
          // JSON parsing with better error handling
          try {
            const jsonData = JSON.parse(extractedJson);
            return this.processCharacterConcepts(jsonData);
          } catch (parseError) {
            console.error('JSON parse error at alternative extraction:', parseError);
            console.error('Problematic JSON around position:', this.getJsonErrorContext(extractedJson, parseError));
            
            // Try to fix common JSON issues
            const cleanedJson = this.cleanJsonString(extractedJson);
            console.log('Attempting to parse cleaned JSON...');
            const jsonData = JSON.parse(cleanedJson);
            return this.processCharacterConcepts(jsonData);
          }
        }
        throw new Error('JSON format not found in AI concept response');
      }

      console.log('Found concept JSON block length:', jsonMatch[1].length);
      console.log('Found concept JSON block (full):', jsonMatch[1]);
      
      try {
        const jsonData = JSON.parse(jsonMatch[1]);
        return this.processCharacterConcepts(jsonData);
      } catch (parseError) {
        console.error('JSON parse error at main parsing:', parseError);
        console.error('Problematic JSON around position:', this.getJsonErrorContext(jsonMatch[1], parseError));
        
        // Try to fix common JSON issues
        const cleanedJson = this.cleanJsonString(jsonMatch[1]);
        console.log('Attempting to parse cleaned JSON...');
        const jsonData = JSON.parse(cleanedJson);
        return this.processCharacterConcepts(jsonData);
      }
    } catch (error) {
      console.error('Failed to parse AI character concept response:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse AI character concept response: ${errorMessage}. The AI response may be malformed.`);
    }
  }

  /**
   * JSON parse error context helper
   */
  private getJsonErrorContext(jsonString: string, error: any): string {
    if (error.message && error.message.includes('position')) {
      const positionMatch = error.message.match(/position (\d+)/);
      if (positionMatch) {
        const position = parseInt(positionMatch[1]);
        const start = Math.max(0, position - 50);
        const end = Math.min(jsonString.length, position + 50);
        return `"${jsonString.substring(start, end)}" (error at position ${position})`;
      }
    }
    return 'No position info available';
  }

  /**
   * Clean common JSON parsing issues
   */
  private cleanJsonString(jsonString: string): string {
    console.log('🔧 ENTERING cleanJsonString method');
    console.log('🔧 Input JSON (first 100 chars):', jsonString.substring(0, 100));
    
    // Remove potential non-JSON content and fix common issues
    let cleaned = jsonString.trim();
    
    // Remove any markdown or extra formatting
    cleaned = cleaned.replace(/```json/g, '');
    cleaned = cleaned.replace(/```/g, '');
    
    // Fix line breaks within JSON strings that break parsing
    // Replace problematic newlines within string values
    cleaned = cleaned.replace(/"\s*\n\s*"/g, '" "');
    cleaned = cleaned.replace(/"\s*\n\s*/g, '" ');
    cleaned = cleaned.replace(/\s*\n\s*"/g, ' "');
    
    // CRITICAL: Remove JSON comments (// style) that Gemini AI often adds
    cleaned = cleaned.replace(/\s*\/\/.*$/gm, '');
    
    // Remove /* style comments */
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Fix unescaped quotes in strings (critical issue with Gemini AI responses)
    // Handle specific problematic patterns like "name": "Kenji \"鷹" Tanaka"
    
    // PRE-STEP 1A: Fix exact Gemini pattern from logs - "name : "value"
    // This is the most common issue causing failures
    console.log('🔧 CRITICAL: Before key fixing:', cleaned.substring(0, 50));
    console.log('🔧 CRITICAL: Full pattern check - does it contain "name :":', cleaned.includes('name :'));
    
    // Fix the specific pattern: { "name : "value" -> { "name": "value"
    const beforeFix = cleaned;
    cleaned = cleaned.replace(/(\{|\,)\s*"([^"]+)\s+:\s*"/g, '$1 "$2": "');
    if (cleaned !== beforeFix) {
      console.log('Applied key space fix');
    }
    
    // Additional targeted fix for the exact pattern from logs
    cleaned = cleaned.replace(/\{\s*"([^"]+)\s+:\s*"/g, '{ "$1": "');
    console.log('After key fixing:', cleaned.substring(0, 50));
    
    // PRE-STEP 1B: Fix any remaining missing closing quotes in keys
    cleaned = cleaned.replace(/(\{|\,)\s*"([^"]*)\s*:\s*"([^"]*)/g, (_match, prefix, key, valueStart) => {
      console.log(`Fixing missing closing quote in key: "${key}"`);
      return `${prefix} "${key}": "${valueStart}`;
    });
    
    // PRE-STEP 1C: Fix missing closing quotes in keys (alternative pattern)
    cleaned = cleaned.replace(/"([^"]*)\s+:\s*"/g, (_match, key) => {
      console.log(`Fixing key spacing: "${key}"`);
      return `"${key}": "`;
    });
    
    // PRE-STEP 2: Fix missing opening quotes in keys (e.g., "characters : -> "characters":)
    cleaned = cleaned.replace(/"([^"]+)\s*:\s*(?!")/g, (_match, key) => {
      // Only fix if it's actually a key (followed by value content, not another key)
      console.log(`Fixing missing quotes in key: "${key}"`);
      return `"${key}": "`;
    });
    
    // PRE-STEP 3: Fix missing opening quotes in values after colon (e.g., "name":  text" -> "name": "text")
    cleaned = cleaned.replace(/"([^"]+)":\s*([^"\s{[]]+[^",\}\]]*)/g, (_match, key, value) => {
      // Check if value doesn't start with a quote and doesn't look like a number, boolean, or object
      if (!value.match(/^\d+$/) && !value.match(/^(true|false|null)$/)) {
        console.log(`Adding missing opening quote: key="${key}", value="${value}"`);
        return `"${key}": "${value}`;
      }
      return _match;
    });
    
    // PRE-STEP 4: Fix cases where value starts correctly but has unmatched quotes
    // Pattern: "key": "start text" end text -> "key": "start text end text"
    cleaned = cleaned.replace(/"([^"]+)":\s*"([^"]*)"(\s*[^,\}\]]+)/g, (_match, key, quotedPart, remainder) => {
      if (remainder && !remainder.match(/^[\s,\}\]]/)) {
        console.log(`Fixing unmatched quote: key="${key}", quotedPart="${quotedPart}", remainder="${remainder}"`);
        const cleanRemainder = remainder.replace(/"/g, '').trim();
        return `"${key}": "${quotedPart} ${cleanRemainder}"`;
      }
      return _match;
    });
    
    // STEP 1: Fix the most common pattern: "key": "value \"word" remaining text"
    // This handles cases where AI puts quotes around parts of names with Japanese characters
    cleaned = cleaned.replace(/"([^"]*)":\s*"([^"]*\\"[^"]*)"([^",\}\]]+)"?/g, (_match, key, quotedPart, remainder) => {
      console.log(`Fixing quote pattern: key="${key}", quotedPart="${quotedPart}", remainder="${remainder}"`);
      // Remove any trailing quote and reconstruct as a single string
      const cleanRemainder = remainder.replace(/^"|"$/g, '').trim();
      return `"${key}": "${quotedPart} ${cleanRemainder}"`;
    });
    
    // STEP 2: Fix cases where there are unescaped quotes splitting string values
    // Pattern: "key": "first part" second part" -> "key": "first part second part"
    cleaned = cleaned.replace(/"([^"]+)":\s*"([^"]*)"(\s+[^",\}\]]+)"?/g, (_match, key, firstPart, remainder) => {
      // Check if this looks like a split string (remainder doesn't start with structural characters)
      if (remainder && !remainder.match(/^[\s,\}\]]/)) {
        console.log(`Merging split string: key="${key}", firstPart="${firstPart}", remainder="${remainder}"`);
        const cleanRemainder = remainder.replace(/^"|"$/g, '').trim();
        return `"${key}": "${firstPart} ${cleanRemainder}"`;
      }
      return _match;
    });
    
    // STEP 3: Removed problematic regex that was breaking valid JSON
    // The previous regex was incorrectly "fixing" valid JSON patterns like "name": "value"
    
    // STEP 4: Removed problematic Japanese text regex that was breaking valid JSON
    // The previous regex was incorrectly "fixing" valid JSON patterns like "日本語": "value"
    
    // Fix unescaped forward slashes
    cleaned = cleaned.replace(/\\\//g, '/');
    
    // Fix unquoted + signs in numbers (common in Gemini AI responses)
    // Replace ": +number" with ": number"
    cleaned = cleaned.replace(/:\s*\+(\d+)/g, ': $1');
    
    // Remove any trailing commas before closing brackets
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    
    console.log('Cleaned JSON length:', cleaned.length);
    console.log('Cleaned JSON (first 300 chars):', cleaned.substring(0, 300));
    // Trigger nodemon restart
    
    // Final validation: try to parse the cleaned JSON to catch any remaining issues
    try {
      JSON.parse(cleaned);
      console.log('✅ JSON cleaning successful - JSON is now valid');
    } catch (validationError) {
      console.error('❌ JSON cleaning failed - still invalid:', validationError);
      console.log('PROBLEMATIC CLEANED JSON:', cleaned);
      
      // Additional emergency fix for common remaining issues
      // Try to fix specific patterns that commonly cause issues
      const originalCleaned = cleaned;
      
      // Fix cases where there might be an unmatched quote at the end of string values
      cleaned = cleaned.replace(/([^\\])"(\s*[,\}])/g, '$1$2');
      
      // Try parsing again after emergency fix
      try {
        JSON.parse(cleaned);
        console.log('✅ Emergency fix successful');
      } catch (secondError) {
        console.error('❌ Emergency fix also failed, reverting to original cleaned version');
        cleaned = originalCleaned;
      }
    }
    
    return cleaned;
  }

  /**
   * JSON概要データを処理してキャラクター概要リストを作成
   */
  private processCharacterConcepts(jsonData: any): CharacterConcept[] {
    if (!jsonData.characters || !Array.isArray(jsonData.characters)) {
      throw new Error('Invalid character concepts format: missing characters array');
    }

    const concepts: CharacterConcept[] = [];
    
    for (const char of jsonData.characters) {
      if (!char.name || !char.role || !char.characterClass || !char.characterType) {
        console.warn('Skipping incomplete character concept:', char);
        continue;
      }

      concepts.push({
        name: char.name || 'Unknown Character',
        role: char.role || 'Unknown Role',
        characterClass: char.characterClass || 'Adventurer',
        characterType: char.characterType as CharacterType || 'PC',
        brief: char.brief || 'A mysterious character.',
      });
    }

    if (concepts.length === 0) {
      throw new Error('No valid character concepts found in AI response');
    }

    return concepts;
  }

  /**
   * JSONデータを処理してキャラクターレスポンスを作成
   */
  private processCharacterData(jsonData: any): AICharacterResponse {
    // 必要なフィールドが存在するかチェック
    const requiredFields = ['name', 'characterClass', 'description', 'baseStats'];
    for (const field of requiredFields) {
      if (!jsonData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return {
      name: jsonData.name || 'Generated Character',
      characterClass: jsonData.characterClass || 'Adventurer',
      description: jsonData.description || 'A mysterious character.',
      background: jsonData.background || 'Unknown background.',
      personality: jsonData.personality || 'A unique personality.',
      alignment: jsonData.alignment || 'Neutral',
      baseStats: {
        strength: this.validateStat(jsonData.baseStats.strength, 12),
        dexterity: this.validateStat(jsonData.baseStats.dexterity, 12),
        constitution: this.validateStat(jsonData.baseStats.constitution, 12),
        intelligence: this.validateStat(jsonData.baseStats.intelligence, 12),
        wisdom: this.validateStat(jsonData.baseStats.wisdom, 12),
        charisma: this.validateStat(jsonData.baseStats.charisma, 12),
      },
      level: Math.max(1, Math.min(5, jsonData.level || 1)),
      maxHitPoints: Math.max(10, Math.min(100, jsonData.maxHitPoints || 30)),
      maxMagicPoints: Math.max(0, Math.min(100, jsonData.maxMagicPoints || 20)),
    };
  }

  /**
   * ステータス値を検証
   */
  private validateStat(value: any, defaultValue: number): number {
    const num = typeof value === 'number' ? value : parseInt(value);
    if (isNaN(num) || num < 3 || num > 18) {
      return defaultValue;
    }
    return num;
  }


  /**
   * AIレスポンスからCharacterオブジェクトを作成
   */
  private createCharacterFromAIResponse(
    campaignId: string,
    characterType: CharacterType,
    aiResponse: AICharacterResponse
  ): Character {
    const derivedStats: DerivedStats = this.calculateDerivedStats(aiResponse.baseStats, aiResponse.level);
    
    const baseCharacter = {
      id: uuidv4(),
      campaignId,
      name: aiResponse.name,
      description: aiResponse.description,
      age: 25,
      race: 'Human',
      characterClass: aiResponse.characterClass || 'Fighter',
      level: aiResponse.level,
      experience: 0,
      baseStats: aiResponse.baseStats,
      derivedStats: {
        ...derivedStats,
        hitPoints: aiResponse.maxHitPoints,
        maxHitPoints: aiResponse.maxHitPoints,
        magicPoints: aiResponse.maxMagicPoints,
        maxMagicPoints: aiResponse.maxMagicPoints,
      },
      skills: [],
      feats: [],
      equipment: [],
      statusEffects: [],
      appearance: aiResponse.description || 'A mysterious figure.',
      background: aiResponse.background || 'Unknown background.',
      currentLocationId: undefined,
      locationHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // キャラクタータイプ別の追加情報
    if (characterType === 'PC') {
      const character: TRPGCharacter = {
        ...baseCharacter,
        characterType: 'PC',
        growth: {
          levelUpHistory: [],
          nextLevelExp: 100,
          unspentSkillPoints: 0,
          unspentFeatPoints: 0,
        },
        party: {
          role: 'dps',
          position: 'front',
          leadership: false,
        },
        playerNotes: '',
        gmNotes: `AI generated character for ${characterType} role.`,
      };
      return character;
    } else if (characterType === 'NPC') {
      const npcCharacter = {
        ...baseCharacter,
        characterType: 'NPC' as const,
        npcData: {
          importance: 'minor' as const,
          disposition: 'neutral' as const,
          occupation: 'Adventurer',
          location: 'Town',
          aiPersonality: {
            traits: ['Helpful', 'Curious'],
            goals: ['Assist players'],
            motivations: ['Friendship'],
            fears: ['Conflict'],
            autonomyLevel: 'assisted' as const,
            decisionMaking: {
              aggressiveness: 0,
              curiosity: 7,
              loyalty: 5,
              rationality: 6,
              sociability: 8,
            },
            actionPriorities: {
              self_preservation: 6,
              goal_achievement: 5,
              relationship_maintenance: 8,
              information_gathering: 7,
              conflict_avoidance: 9,
            },
            responsePatterns: {
              greetings: ['Hello there!'],
              farewells: ['Farewell!'],
              agreements: ['I agree.'],
              disagreements: ['I think differently.'],
              questions: ['What do you think?'],
              combat_taunts: ['Take this!'],
              help_requests: ['Can you help me?'],
              thank_you: ['Thank you!'],
            },
            relationships: {},
          },
          storyRole: {
            questInvolvement: [],
            plotHooks: [],
            secrets: [],
            information: [],
          },
          memory: {
            interactions: [],
            relationshipChanges: [],
          },
        },
      };
      return npcCharacter;
    } else {
      // Enemy character
      const enemyCharacter = {
        ...baseCharacter,
        characterType: 'Enemy' as const,
        enemyData: {
          category: 'minion' as const,
          challengeRating: 1,
          encounterLevel: 1,
          combat: {
            tactics: ['Direct attack'],
            specialAbilities: [],
            weaknesses: ['Physical damage'],
            resistances: [],
            immunities: [],
            aiCombatBehavior: {
              autonomyLevel: 'autonomous' as const,
              aggression: 7,
              intelligence: 5,
              teamwork: 4,
              preservation: 3,
              preferredTargets: ['closest' as const],
              combatDialogue: {
                battle_start: ['Fight me!'],
                taking_damage: ['Agh!'],
                dealing_damage: ['Take that!'],
                low_health: ['I won\'t give up!'],
                victory: ['I won!'],
                defeat: ['Defeated...'],
              },
              tacticalDecisions: {
                retreat_threshold: 20,
                ability_usage_strategy: 'balanced' as const,
                positioning_preference: 'front' as const,
                focus_fire: false,
              },
            },
          },
          encounter: {
            environment: ['Any'],
            companions: [],
            tactics: 'Direct assault',
            escapeThreshold: 25,
            morale: 50,
          },
          loot: {
            experience: 50,
            currency: 10,
            items: [],
          },
        },
      };
      return enemyCharacter;
    }
  }

  /**
   * 派生ステータス計算
   */
  private calculateDerivedStats(baseStats: BaseStats, _level: number): DerivedStats {
    const dexMod = Math.floor((baseStats.dexterity - 10) / 2);

    return {
      hitPoints: 0, // Will be set separately
      maxHitPoints: 0, // Will be set separately
      magicPoints: 0, // Will be set separately
      maxMagicPoints: 0, // Will be set separately
      armorClass: 10 + dexMod,
      initiative: dexMod,
      speed: 30, // Default speed
    };
  }

}

export const aiCharacterGenerationService = new AICharacterGenerationService();