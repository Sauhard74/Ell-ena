import OpenAI from 'openai';
import config from '../config/config';

const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    const response = await openai.embeddings.create({
      model: config.openai.embeddingModel,
      input: text,
      encoding_format: "float"
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
};

export const chatCompletion = async (
  messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>,
  temperature: number = 0.7,
  maxTokens?: number
): Promise<string> => {
  try {
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });
    
    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Error with chat completion:', error);
    throw error;
  }
};

export const transcribeAudio = async (audioBuffer: Buffer, prompt?: string): Promise<string> => {
  try {
    const response = await openai.audio.transcriptions.create({
      file: new File([audioBuffer], 'audio.mp3', { type: 'audio/mp3' }),
      model: "whisper-1",
      language: "en",
      prompt
    });
    
    return response.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
};

export const generateSummary = async (text: string): Promise<string> => {
  const messages = [
    {
      role: 'system' as const,
      content: 'You are a helpful assistant that creates concise, informative summaries.'
    },
    {
      role: 'user' as const,
      content: `Please summarize the following text in a concise but comprehensive manner, capturing the key points and important details: "${text}"`
    }
  ];
  
  return chatCompletion(messages, 0.5);
};

export const extractTasks = async (
  text: string, 
  workspaceId: string
): Promise<Array<{ title: string, description?: string, priority?: string, dueDate?: string }>> => {
  const messages = [
    {
      role: 'system' as const,
      content: 'You are a productivity assistant that identifies tasks from transcripts or text. Extract only clear action items or tasks.'
    },
    {
      role: 'user' as const,
      content: `Extract all tasks from the following text. Format the output as a JSON array of task objects.
Each task should have: title (required), description (optional), priority (optional, one of: low, medium, high), dueDate (optional, in ISO format).
Only include tasks that are clearly stated or implied as action items. Text: "${text}"`
    }
  ];
  
  try {
    const result = await chatCompletion(messages, 0.3);
    return JSON.parse(result);
  } catch (error) {
    console.error('Error extracting tasks:', error);
    return [];
  }
};

export default {
  generateEmbedding,
  chatCompletion,
  transcribeAudio,
  generateSummary,
  extractTasks
}; 