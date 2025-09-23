import { GoogleGenAI, Type } from "@google/genai";
import { ClassicFlashcard, GameMode, QuizFlashcard } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const classicSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      question: {
        type: Type.STRING,
        description: "The question for the flashcard. It should be clear and concise.",
      },
      answer: {
        type: Type.STRING,
        description: "The answer to the question. It should be accurate and to the point.",
      },
    },
    required: ["question", "answer"],
  },
};

const quizSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      question: {
        type: Type.STRING,
        description: "The multiple-choice question for the flashcard.",
      },
      options: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "An array of 4 possible answers. One of them must be correct.",
      },
      correctAnswer: {
        type: Type.STRING,
        description: "The correct answer from the 'options' array.",
      },
    },
    required: ["question", "options", "correctAnswer"],
  },
};

export async function generateFlashcards(
  inputText: string,
  cardCount: number,
  mode: GameMode
): Promise<(ClassicFlashcard | QuizFlashcard)[]> {
  const model = 'gemini-2.5-flash';
  
  const prompt = `Your task is to act as a study assistant. First, analyze and summarize the key information from the following text. Then, based on your summary and the most critical points in the text, generate exactly ${cardCount} flashcards. The flashcards should be designed to help someone learn and remember the material effectively.
  
  Mode: ${mode}
  
  Text:
  ---
  ${inputText}
  ---
  
  Ensure the flashcards cover a range of topics from the text, focusing on core concepts, important definitions, and significant data points. Provide the output in the specified JSON format.`;

  const schema = mode === GameMode.CLASSIC ? classicSchema : quizSchema;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const jsonText = response.text.trim();
    if (!jsonText) {
        throw new Error("API returned an empty response.");
    }

    const parsedData = JSON.parse(jsonText);
    
    if (!Array.isArray(parsedData)) {
      throw new Error("API did not return an array of flashcards.");
    }
    
    // Basic validation
    if (mode === GameMode.CLASSIC) {
        return parsedData.filter(c => c.question && c.answer) as ClassicFlashcard[];
    } else {
        return parsedData.filter(c => c.question && Array.isArray(c.options) && c.options.length > 0 && c.correctAnswer) as QuizFlashcard[];
    }

  } catch (error) {
    console.error("Error generating flashcards with Gemini:", error);
    throw new Error("Failed to parse flashcards from AI response.");
  }
}
