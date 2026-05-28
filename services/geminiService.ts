import { GoogleGenAI, Type } from "@google/genai";
import { ClassicFlashcard, GameMode, QuizFlashcard } from '../types';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required but not set.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

const classicSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      question: {
        type: Type.STRING,
        description: "A concise question for the flashcard, focusing on a key concept. Keep it short enough to be easily readable on a small card.",
      },
      answer: {
        type: Type.STRING,
        description: "A brief and direct answer to the question. Aim for a few key words or a single short sentence.",
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
        description: "A concise multiple-choice question for the flashcard. It should be clear and not too long.",
      },
      options: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "An array of 4 possible answers. Each option should be brief and to the point. One of them must be correct.",
      },
      correctanswer: {
        type: Type.STRING,
        description: "The correct answer from the 'options' array.",
      },
    },
    required: ["question", "options", "correctanswer"],
  },
};

// Helper function to shuffle an array using Fisher-Yates algorithm
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export async function generateFlashcards(
  inputText: string,
  cardCount: number,
  mode: GameMode
): Promise<(ClassicFlashcard | QuizFlashcard)[]> {
  const model = 'gemini-2.5-flash';

  const systemInstruction = `You are an expert study assistant. Your purpose is to analyze the provided text, identify key concepts, and generate high-quality flashcards in a structured JSON format. Your output must strictly be a JSON array, starting with '[' and ending with ']'. Do not add any commentary, explanations, or introductory text. Crucially, all generated content must be highly summarized and concise to fit well on a flashcard. Questions should be short and direct. Answers should be as brief as possible, ideally a few words or a single short sentence.`;
  
  // We append a random identifier to the prompt to discourage caching
  const prompt = `From the following text, generate up to ${cardCount} flashcards in ${mode} mode.

Source Text:
---
${inputText}
---

Generation ID: ${Date.now()}`;

  const schema = mode === GameMode.CLASSIC ? classicSchema : quizSchema;
  let rawResponseText = "";

  try {
    const stream = await getAiClient().models.generateContentStream({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 1,
        seed: Math.floor(Math.random() * 10000000),
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
        const quizCards = validatedAndSlicedData.filter(c => c.question && Array.isArray(c.options) && c.options.length > 0 && c.correctanswer) as QuizFlashcard[];
        
        // Shuffle the options for each card to ensure the correct answer isn't biased towards a specific position (like B or C).
        return quizCards.map(card => ({
            ...card,
            options: shuffleArray(card.options)
        }));
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