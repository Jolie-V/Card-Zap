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

  const systemInstruction = `You are an expert study assistant. Your sole purpose is to analyze text and generate high-quality flashcards in a structured JSON format. You must strictly adhere to the provided JSON schema. Do not add any commentary, explanations, or introductory text. Your output must be only the JSON array, starting with '[' and ending with ']'.`;
  
  const prompt = `From the following text, generate up to ${cardCount} flashcards in ${mode} mode.

Source Text:
---
${inputText}
---`;

  const schema = mode === GameMode.CLASSIC ? classicSchema : quizSchema;
  let rawResponseText = "";

  try {
    const stream = await ai.models.generateContentStream({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });
    
    for await (const chunk of stream) {
        rawResponseText += chunk.text;
    }

    if (!rawResponseText) {
        throw new Error("API returned an empty response stream.");
    }
    
    // Robust JSON parsing: find the start of the array and the end of the array
    let jsonText = rawResponseText.trim();
    const startIndex = jsonText.indexOf('[');
    const endIndex = jsonText.lastIndexOf(']');

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        console.error("Failed to find a valid JSON array in the AI response. Full response:", jsonText);
        throw new Error("AI response did not contain a valid JSON array structure.");
    }

    jsonText = jsonText.substring(startIndex, endIndex + 1);

    const parsedData = JSON.parse(jsonText);
    
    if (!Array.isArray(parsedData)) {
      throw new Error("API did not return an array of flashcards.");
    }
    
    // Ensure we don't return more cards than requested
    const validatedAndSlicedData = parsedData.slice(0, cardCount);

    // Basic validation on the sliced data
    if (mode === GameMode.CLASSIC) {
        return validatedAndSlicedData.filter(c => c.question && c.answer) as ClassicFlashcard[];
    } else {
        return validatedAndSlicedData.filter(c => c.question && Array.isArray(c.options) && c.options.length > 0 && c.correctAnswer) as QuizFlashcard[];
    }

  } catch (error) {
    console.error("Error generating flashcards with Gemini:", error);
    // Log the raw response for debugging if parsing fails
    if (error instanceof SyntaxError) {
        console.error("Raw response that failed to parse:", rawResponseText);
        throw new Error("Failed to parse the AI's response as valid JSON. The format was incorrect.");
    }
    // Re-throw other errors
    throw error;
  }
}