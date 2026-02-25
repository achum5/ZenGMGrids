import { GoogleGenAI } from "@google/genai";

// DON'T DELETE THIS COMMENT
// Using Gemini integration blueprint for API key management

// Initialize Gemini AI with API key from environment
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * Get response from Gemini 2.5 Pro model
 * @param prompt - Text prompt to send to the model
 * @returns Promise<string> - Response text from Gemini
 */
export async function get_gemini_response(prompt: string): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
        });

        return response.text || "No response generated";
    } catch (error) {
        throw new Error(`Failed to get Gemini response: ${error}`);
    }
}