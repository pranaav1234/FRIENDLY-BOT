import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: 'Who won the last Super Bowl?',
    });
    console.log("SUCCESS:", response.text);
  } catch (err) {
    console.error("ERROR:");
    console.error(err);
  }
}
test();
