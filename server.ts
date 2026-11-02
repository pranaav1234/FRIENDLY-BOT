import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import mammoth from 'mammoth';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Robust PDF text extractor compatible with pdf-parse v1 and v2
async function extractPdfText(buffer: Buffer): Promise<{ text?: string; pageCount?: number }> {
  try {
    const pdfPkg = require('pdf-parse');
    if (typeof pdfPkg === 'function') {
      const parsed = await pdfPkg(buffer);
      return { text: parsed?.text, pageCount: parsed?.numpages };
    }
    const PDFClass = pdfPkg?.PDFParse || (pdfPkg?.default && pdfPkg.default.PDFParse) || pdfPkg?.default;
    if (PDFClass && typeof PDFClass === 'function') {
      const parser = new PDFClass({ data: buffer });
      try {
        const result = await parser.getText();
        return { text: result?.text, pageCount: result?.total || result?.pages?.length };
      } finally {
        if (typeof parser.destroy === 'function') {
          try {
            await parser.destroy();
          } catch {
            // ignore cleanup error
          }
        }
      }
    }
  } catch (err) {
    console.warn('PDF text extraction notice (will rely on multimodal PDF parser if needed):', err);
  }
  return {};
}

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Lazy initialization of Google GenAI SDK for server-side API calls
let genAI: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      console.warn('Warning: GEMINI_API_KEY environment variable is missing or empty.');
    }
    genAI = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAI;
}

// Helper to execute generation with multi-model fallback and retry
async function generateContentWithFallback(options: {
  contents: any;
  config?: any;
}) {
  const models = [
    'gemini-3-flash-preview',
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-flash-latest',
  ];
  let lastError: any = null;
  const ai = getGenAI();

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }
  throw lastError;
}

// Helper to execute streaming with multi-model fallback and retry
async function generateStreamWithFallback(options: {
  contents: any;
  config?: any;
}) {
  const models = [
    'gemini-3-flash-preview',
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-flash-latest',
  ];
  let lastError: any = null;
  const ai = getGenAI();

  for (const model of models) {
    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents: options.contents,
        config: options.config,
      });
      return stream;
    } catch (err: any) {
      lastError = err;
      // Immediate failover to next model without waiting/retrying failing models
      continue;
    }
  }
  throw lastError;
}

// AI Voice Assistant API Endpoint with Fast Generation
app.post('/api/voice-assistant/generate', async (req, res) => {
  try {
    const { prompt, mode = 'simple', history = [], enableSearch = false } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'A non-empty prompt string is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set in environment.');
      return res.json({
        text: `Voice assistant is running in offline local mode. Configure the API key in environment for online capabilities.`,
        sources: [],
        mode,
      });
    }

    const ai = getGenAI();

    let systemInstruction =
      'You are Friendly Bot, an intelligent, conversational, and polite AI Voice Assistant. Respond accurately, clearly, and directly without meta-commentary or boilerplate disclaimers. Never state your model name or underlying AI provider in your responses.';

    if (mode === 'simple') {
      systemInstruction +=
        ' Mode: Simple Answer. Provide a concise, clear, and direct answer (2 to 4 sentences maximum) suitable for fast voice playback.';
    } else if (mode === 'detailed') {
      systemInstruction +=
        ' Mode: Detailed Answer. Provide a comprehensive, well-structured explanation covering key concepts, context, and background information.';
    } else if (mode === 'analysis') {
      systemInstruction +=
        ' Mode: Analysis Mode. Provide an in-depth analytical breakdown with key points, structural insights, comparisons, pros/cons, or examples where applicable. Use formatted headings, bullet points, or sections.';
    }

    // Format chat history context
    const contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const item of history.slice(-6)) {
        if (item.role === 'user' || item.role === 'assistant') {
          contents.push({
            role: item.role === 'user' ? 'user' : 'model',
            parts: [{ text: item.text }],
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: prompt.trim() }],
    });

    let responseText = '';
    let uniqueSources: { title: string; url: string }[] = [];

    // Check if user specifically requested real-time web search or news
    const needsSearch =
      enableSearch ||
      /\b(today|latest|current weather|live score|news today|stock price|what time is it in)\b/i.test(prompt);

    if (needsSearch) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents,
          config: {
            systemInstruction,
            tools: [{ googleSearch: {} }],
          },
        });

        responseText = response.text || '';
        const sources: { title: string; url: string }[] = [];
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (Array.isArray(chunks)) {
          for (const chunk of chunks) {
            if (chunk.web?.uri) {
              sources.push({
                title: chunk.web.title || chunk.web.uri,
                url: chunk.web.uri,
              });
            }
          }
        }
        uniqueSources = sources.filter(
          (src, idx, self) => self.findIndex((s) => s.url === src.url) === idx
        );
      } catch (searchErr) {
        console.log('Search grounding not available, falling back to direct fast generation.');
      }
    }

    if (!responseText) {
      try {
        const response = await generateContentWithFallback({
          contents,
          config: {
            systemInstruction,
          },
        });
        responseText = response.text || '';
      } catch (genErr: any) {
        console.warn('All generation models failed:', genErr?.message);
        responseText = 'I am currently experiencing high demand. Please try asking your question again in a moment.';
      }
    }

    if (!responseText) {
      responseText = 'Sorry, no response could be generated. Please try rephrasing your question.';
    }

    return res.json({
      text: responseText,
      sources: uniqueSources,
      mode,
    });
  } catch (error: any) {
    console.error('Error handling voice assistant request:', error);
    return res.status(500).json({
      error: 'Internal server error while processing request.',
      details: error?.message,
    });
  }
});

// AI Voice Assistant Streaming API Endpoint (Server-Sent Events) for instant responses
app.post('/api/voice-assistant/stream', async (req, res) => {
  try {
    const { prompt, mode = 'simple', history = [] } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'A non-empty prompt string is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({ text: 'API key is missing in server environment.' });
    }

    let systemInstruction =
      'You are Friendly Bot, an intelligent, conversational, and polite AI Voice Assistant. Respond accurately, clearly, and directly without meta-commentary. Never state your model name or underlying AI provider in your responses.';

    if (mode === 'simple') {
      systemInstruction +=
        ' Mode: Simple Answer. Provide a concise, clear, and direct answer (2 to 4 sentences maximum) suitable for fast voice playback.';
    } else if (mode === 'detailed') {
      systemInstruction +=
        ' Mode: Detailed Answer. Provide a comprehensive, well-structured explanation covering key concepts, context, and background information.';
    } else if (mode === 'analysis') {
      systemInstruction +=
        ' Mode: Analysis Mode. Provide an in-depth analytical breakdown with key points, structural insights, comparisons, pros/cons, or examples where applicable.';
    }

    const contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const item of history.slice(-6)) {
        if (item.role === 'user' || item.role === 'assistant') {
          contents.push({
            role: item.role === 'user' ? 'user' : 'model',
            parts: [{ text: item.text }],
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: prompt.trim() }],
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const stream = await generateStreamWithFallback({
        contents,
        config: {
          systemInstruction,
        },
      });

      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (streamErr: any) {
      console.warn('Streaming generation error:', streamErr?.message);
      res.write(`data: ${JSON.stringify({ text: "I'm having a brief connection delay. Please ask again in a moment." })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (err: any) {
    console.error('Error in streaming endpoint:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'Streaming failed' });
    } else {
      res.write(`data: ${JSON.stringify({ error: err?.message || 'Stream interrupted' })}\n\n`);
      res.end();
    }
  }
});

// Document & Text Summariser API Endpoint
app.post('/api/summarise/generate', async (req, res) => {
  try {
    const {
      text,
      fileData,
      mimeType = 'text/plain',
      fileName = '',
      summaryLevel = 'standard',
      summaryType,
      refinement,
    } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'The summarisation service is not configured correctly. Please check the application configuration.',
      });
    }

    let extractedText = typeof text === 'string' ? text.trim() : '';
    let isImage = false;
    let isPdf = false;
    let cleanMime = mimeType;
    let pageCount: number | undefined = undefined;

    // Detect file type and extract content
    if (fileData) {
      const buffer = Buffer.from(fileData, 'base64');
      const lowerName = (fileName || '').toLowerCase();

      if (lowerName.endsWith('.docx') || cleanMime.includes('wordprocessingml') || cleanMime.includes('docx')) {
        try {
          const mammothResult = await mammoth.extractRawText({ buffer });
          extractedText = mammothResult.value.trim();
          cleanMime = 'text/plain';
          if (!extractedText) {
            return res.status(400).json({ error: 'No readable content was found in this Word document.' });
          }
        } catch (docxErr: any) {
          console.error('Word extraction error:', docxErr);
          return res.status(400).json({ error: 'This Word document could not be parsed. Please check the file.' });
        }
      } else if (lowerName.endsWith('.doc') || cleanMime === 'application/msword') {
        try {
          const mammothResult = await mammoth.extractRawText({ buffer });
          extractedText = mammothResult.value.trim();
          cleanMime = 'text/plain';
        } catch {
          return res.status(400).json({ error: 'Legacy .doc format is not supported. Please save your file as modern .docx or .pdf.' });
        }
      } else if (lowerName.endsWith('.pdf') || cleanMime === 'application/pdf') {
        isPdf = true;
        cleanMime = 'application/pdf';
        try {
          const parsedPdf = await extractPdfText(buffer);
          pageCount = parsedPdf.pageCount;
          if (parsedPdf.text && parsedPdf.text.trim().length > 20) {
            extractedText = parsedPdf.text.trim();
          }
        } catch (pdfErr) {
          console.warn('PDF text extraction notice (will rely on multimodal PDF parser):', pdfErr);
        }
      } else if (
        cleanMime.startsWith('image/') ||
        lowerName.endsWith('.png') ||
        lowerName.endsWith('.jpg') ||
        lowerName.endsWith('.jpeg') ||
        lowerName.endsWith('.webp') ||
        lowerName.endsWith('.gif')
      ) {
        isImage = true;
        if (!cleanMime.startsWith('image/')) {
          if (lowerName.endsWith('.png')) cleanMime = 'image/png';
          else if (lowerName.endsWith('.webp')) cleanMime = 'image/webp';
          else if (lowerName.endsWith('.gif')) cleanMime = 'image/gif';
          else cleanMime = 'image/jpeg';
        }
      } else if (
        lowerName.endsWith('.txt') ||
        lowerName.endsWith('.md') ||
        lowerName.endsWith('.csv') ||
        lowerName.endsWith('.json') ||
        cleanMime.startsWith('text/') ||
        cleanMime === 'application/json'
      ) {
        extractedText = buffer.toString('utf-8').trim();
      } else {
        return res.status(400).json({ error: 'This file type is not supported.' });
      }
    }

    if (!extractedText && !isImage && !isPdf) {
      return res.status(400).json({ error: 'No readable content was found in this file.' });
    }

    // Determine target summary level (basic, standard, advanced)
    const levelKey = (summaryLevel || summaryType || 'standard').toLowerCase();
    let levelInstruction = '';

    if (levelKey === 'basic') {
      levelInstruction = `Provide a concise BASIC Summary.
Structure strictly with these markdown sections:
### 📌 Overview
[1-2 clear sentences summarizing the central idea and core message]
### 🎯 Key Points
- [Point 1]
- [Point 2]
- [Point 3]
- [Point 4 (if needed, 3-7 points max)]
### ✅ Conclusions
[A brief, clear conclusion]`;
    } else if (levelKey === 'advanced') {
      levelInstruction = `Provide a comprehensive ADVANCED Deep Analysis.
Structure logically with these markdown sections:
### 📌 Overview
[Detailed framing, scope, purpose, and executive context of the document]
### 🎯 Key Points & Major Themes
- [Key Point 1 with detailed explanation]
- [Key Point 2 with detailed explanation]
- [Key Point 3 with detailed explanation]
- [Key Point 4 with detailed explanation]
- [Key Point 5 with detailed explanation]
### 🔬 Detailed Breakdown
[Thorough section-by-section or concept-by-concept analysis covering core mechanisms, facts, and specifics]
### 📊 Important Information & Metrics
- Notable Dates: [Important dates mentioned in document, or N/A]
- Key Numbers & Statistics: [Specific metrics, data points, or counts mentioned, or N/A]
- Important Concepts & Terms: [Crucial domain terms defined clearly]
### 💡 Findings, Relationships & Implications
[Detailed analysis of cause-and-effect, findings, strategic implications, or relationships between ideas]
### ✅ Conclusions
[Final conclusions, key takeaways, and synthesis]
### 📋 Action Items
[Any actionable tasks, responsibilities, or recommendations mentioned in the source (omit if none exist)]`;
    } else {
      // Default: standard
      levelInstruction = `Provide a balanced STANDARD Summary with important details.
Structure clearly with these markdown sections:
### 📌 Overview
[A concise summary defining the purpose, subject matter, and context]
### 🎯 Key Points
- [Key Point 1: clear explanation]
- [Key Point 2: clear explanation]
- [Key Point 3: clear explanation]
- [Key Point 4: clear explanation]
- [Key Point 5: clear explanation]
### 🧠 Important Details
[Important facts, methodology, findings, or notable contextual elements]
### 📊 Key Information
[Key figures, numbers, dates, or definitions present in the content]
### ✅ Conclusions
[Main conclusions, outcomes, and practical significance]`;
    }

    let refinementInstruction = '';
    if (refinement === 'shorter') {
      refinementInstruction = '\nMake the summary more concise and punchy while retaining all critical takeaways.';
    } else if (refinement === 'detailed') {
      refinementInstruction = '\nProvide deeper detail, expanded analysis, and thorough explanations for every point.';
    } else if (refinement === 'simple') {
      refinementInstruction = '\nExplain all concepts simply and clearly, avoiding jargon so anyone can easily understand.';
    }

    const systemInstruction = `You are Friendly Bot's Document Summariser. Transform documents, PDFs, images, articles, and text into accurate, high-value Markdown summaries. Do NOT mention any internal AI model or provider names. Never fabricate information not present in the source. If an image or scanned document is provided, thoroughly analyze all text, diagrams, tables, charts, and visual structure.`;

    // Large document handling (if text exceeds 30,000 chars, perform chunked summarization)
    let processedContent = extractedText;
    if (extractedText.length > 35000 && !isImage) {
      const chunks: string[] = [];
      const chunkSize = 25000;
      for (let i = 0; i < extractedText.length; i += chunkSize) {
        chunks.push(extractedText.slice(i, i + chunkSize));
      }

      const chunkSummaries: string[] = [];
      for (let idx = 0; idx < chunks.length; idx++) {
        const chunkPrompt = `Extract the key points, important facts, data points, and conclusions from Part ${idx + 1} of ${chunks.length} of the document:\n\n"""\n${chunks[idx]}\n"""`;
        try {
          const chunkRes = await generateContentWithFallback({
            contents: chunkPrompt,
            config: { systemInstruction },
          });
          if (chunkRes.text) chunkSummaries.push(`--- Part ${idx + 1} Summary ---\n${chunkRes.text}`);
        } catch {
          chunkSummaries.push(`--- Part ${idx + 1} Snippet ---\n${chunks[idx].slice(0, 4000)}`);
        }
      }
      processedContent = `Here are the extracted comprehensive sections from the complete document:\n\n${chunkSummaries.join('\n\n')}`;
    }

    const parts: any[] = [];

    // Attach inline data for images and PDFs
    if (fileData && (isImage || isPdf)) {
      parts.push({
        inlineData: {
          mimeType: cleanMime,
          data: fileData,
        },
      });
    }

    let userPrompt = `${levelInstruction}${refinementInstruction}\n`;
    if (processedContent) {
      userPrompt += `\nDocument Content:\n"""\n${processedContent}\n"""`;
    } else if (fileName) {
      userPrompt += `\nPlease thoroughly analyze and summarize the attached document: "${fileName}".`;
    } else {
      userPrompt += `\nPlease thoroughly analyze and summarize the attached file.`;
    }

    parts.push({ text: userPrompt });

    const response = await generateContentWithFallback({
      contents: parts,
      config: {
        systemInstruction,
      },
    });

    const summary = response.text || '';
    if (!summary.trim()) {
      return res.status(400).json({ error: 'No readable content was found in this file.' });
    }

    return res.json({
      summary,
      extractedTextSnippet: extractedText ? extractedText.slice(0, 2000) : '',
      pageCount,
    });
  } catch (error: any) {
    console.error('Error generating document summary:', error);
    const status = error?.status || 500;
    const msg = error?.message || '';

    if (
      status === 429 ||
      status === 503 ||
      msg.includes('429') ||
      msg.includes('503') ||
      msg.includes('quota') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('UNAVAILABLE') ||
      msg.includes('high demand')
    ) {
      return res.status(429).json({ error: 'The summarisation service is temporarily busy. Please try again.' });
    }

    if (status === 401 || status === 403 || msg.includes('API key') || msg.includes('configured correctly')) {
      return res.status(500).json({
        error: 'The summarisation service is not configured correctly. Please check the application configuration.',
      });
    }

    if (msg.includes('not supported') || msg.includes('unsupported')) {
      return res.status(400).json({ error: 'This file type is not supported.' });
    }

    if (msg.includes('No readable content')) {
      return res.status(400).json({ error: 'No readable content was found in this file.' });
    }

    if (status === 400 || msg.includes('INVALID_ARGUMENT') || msg.includes('could not be parsed')) {
      return res.status(400).json({ error: 'This document could not be processed. Please check the file and try again.' });
    }

    return res.status(500).json({
      error: 'Unable to connect to the summarisation service. Check your connection and try again.',
    });
  }
});

// Helper to extract JSON from raw markdown/text response
function cleanParseJson(raw: string) {
  if (!raw) return null;
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Email Assistant AI Processing Endpoint
app.post('/api/email-assistant/process', async (req, res) => {
  try {
    const { action, recipient, subject, promptText, tone, length, emailContent, rewriteOption } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'The email assistant service is not configured correctly. Please check application configuration.',
      });
    }

    if (action === 'draft') {
      if (!promptText || !promptText.trim()) {
        return res.status(400).json({ error: 'Please describe what you want to say in the email.' });
      }

      const systemInstruction = `You are an expert email drafting assistant.
Draft a professional email based on the user's instructions.
STRICT RULES:
1. Do NOT invent important facts, dates, names, reasons, figures, or commitments that the user did not provide.
2. Include a proper greeting, clear message body, and appropriate closing.
3. Apply requested tone: "${tone || 'Professional'}" and length: "${length || 'Medium'}".
4. Return valid JSON strictly in this format: {"subject": "...", "body": "..."}
5. Never state your AI model name or provider name.`;

      const prompt = `Draft an email with the following parameters:
Recipient: ${recipient || 'Not specified'}
Subject/Topic: ${subject || 'Not specified'}
User Instructions: ${promptText}
Tone: ${tone || 'Professional'}
Length: ${length || 'Medium'}`;

      const response = await generateContentWithFallback({
        contents: prompt,
        config: { systemInstruction },
      });

      const raw = response.text || '';
      const parsed = cleanParseJson(raw);
      if (parsed) {
        return res.json({
          subject: parsed.subject || subject || 'Draft Email',
          body: parsed.body || raw,
        });
      }
      return res.json({
        subject: subject || 'Draft Email',
        body: raw,
      });
    } else if (action === 'summarize') {
      if (!emailContent || !emailContent.trim()) {
        return res.status(400).json({ error: 'Please paste an email to summarize.' });
      }

      const systemInstruction = `You are an expert email analyzer.
Summarize the provided email accurately and strictly based ONLY on information explicitly present in the email.
STRICT RULES:
1. Do NOT invent or assume missing information. If a detail is missing, state "None mentioned" or "N/A".
2. Return valid JSON strictly in this format:
{
  "mainPoint": "Core message or summary",
  "importantDetails": ["detail 1", "detail 2"],
  "actionRequired": "Actions required or None",
  "importantDates": "Dates mentioned or None",
  "deadlines": "Deadlines mentioned or None",
  "peopleMentioned": ["person 1", "person 2"]
}
3. Never state your model or provider name.`;

      const response = await generateContentWithFallback({
        contents: emailContent,
        config: { systemInstruction },
      });

      const raw = response.text || '';
      const parsed = cleanParseJson(raw);
      if (parsed) {
        return res.json({ summary: parsed });
      }
      return res.json({
        summary: {
          mainPoint: raw,
          importantDetails: [],
          actionRequired: 'None',
          importantDates: 'None',
          deadlines: 'None',
          peopleMentioned: [],
        },
      });
    } else if (action === 'rewrite') {
      if (!emailContent || !emailContent.trim()) {
        return res.status(400).json({ error: 'Please paste an existing email to rewrite.' });
      }

      const opt = rewriteOption || 'Make Professional';
      const systemInstruction = `You are an expert email copywriter.
Rewrite the provided email to achieve the goal: "${opt}".
STRICT RULES:
1. Preserve the exact original meaning and facts.
2. Do NOT add new facts, dates, commitments, or details that were not present in the original email.
3. Output a polished email with proper greeting, body, and sign-off.
4. Never state your model or provider name.`;

      const response = await generateContentWithFallback({
        contents: emailContent,
        config: { systemInstruction },
      });

      return res.json({ rewrittenText: response.text || '' });
    } else if (action === 'organize') {
      if (!emailContent || !emailContent.trim()) {
        return res.status(400).json({ error: 'Please paste email content to organize.' });
      }

      const systemInstruction = `You are an intelligent email triage assistant.
Analyze the provided email text (which may contain one or multiple emails) and organize the contents into categories.
ALLOWED CATEGORIES:
- Needs Reply
- Action Required
- Waiting for Response
- Important
- Information Only
- Deadlines
- Meetings
- Follow-ups

STRICT RULES:
1. Categorize relevant email items/excerpts.
2. Provide a short explanation of WHY each item belongs in that category.
3. Do NOT claim emails were sent, archived, or deleted in live accounts.
4. Return valid JSON strictly formatted as a JSON array of category objects:
[
  {
    "category": "Action Required",
    "items": [
      {
        "subject": "Brief topic or subject",
        "excerpt": "Relevant text excerpt",
        "explanation": "Why this item requires action"
      }
    ]
  }
]
Only include categories that contain relevant items.`;

      const response = await generateContentWithFallback({
        contents: emailContent,
        config: { systemInstruction },
      });

      const raw = response.text || '';
      const parsed = cleanParseJson(raw);
      if (Array.isArray(parsed)) {
        return res.json({ categories: parsed });
      }
      return res.json({
        categories: [
          {
            category: 'Information Only',
            items: [
              {
                subject: 'Email Content',
                excerpt: emailContent.slice(0, 150),
                explanation: 'Analyzed text',
              },
            ],
          },
        ],
      });
    } else {
      return res.status(400).json({ error: 'Invalid action specified.' });
    }
  } catch (err: any) {
    console.error('Email Assistant process error:', err);
    return res.status(500).json({
      error: 'Unable to process email request. Check your connection and try again.',
    });
  }
});

// Follow-up Q&A on Summarised Document
app.post('/api/summarise/chat', async (req, res) => {
  try {
    const { question, originalContent, summary, history = [] } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'The summarisation service is not configured correctly. Please check the application configuration.',
      });
    }

    const systemInstruction = `You are Friendly Bot's Document Assistant. The user has summarised a document and is asking questions about it. Answer based on the provided document content and summary accurately, politely, and clearly. Do NOT mention any internal AI model or provider names. If the answer is not in the document, state that clearly.`;

    const contents: any[] = [];

    // Context message
    contents.push({
      role: 'user',
      parts: [
        {
          text: `Here is the document context and summary:\n\nSummary:\n"""\n${summary || ''}\n"""\n\nOriginal Document Content:\n"""\n${(originalContent || '').slice(0, 50000)}\n"""`,
        },
      ],
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'I have reviewed the document and summary. What question can I answer for you?' }],
    });

    if (Array.isArray(history) && history.length > 0) {
      for (const item of history.slice(-8)) {
        if (item.role === 'user' || item.role === 'assistant') {
          contents.push({
            role: item.role === 'user' ? 'user' : 'model',
            parts: [{ text: item.text }],
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: question.trim() }],
    });

    const response = await generateContentWithFallback({
      contents,
      config: {
        systemInstruction,
      },
    });

    const answer = response.text || 'I could not find an answer in the provided document.';
    return res.json({ answer });
  } catch (error: any) {
    console.error('Error in document follow-up chat:', error);
    const status = error?.status || 500;
    const msg = error?.message || '';

    if (
      status === 429 ||
      status === 503 ||
      msg.includes('429') ||
      msg.includes('503') ||
      msg.includes('quota') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('UNAVAILABLE') ||
      msg.includes('high demand')
    ) {
      return res.status(429).json({ error: 'The summarisation service is temporarily busy. Please try again.' });
    }
    return res.status(500).json({ error: 'Unable to connect to the assistant service. Please try again.' });
  }
});

// Audio Transcription API Endpoint using Gemini Multimodal Audio Input
app.post('/api/voice-assistant/transcribe', async (req, res) => {
  try {
    const { audioData, mimeType = 'audio/webm' } = req.body;

    if (!audioData || typeof audioData !== 'string') {
      return res.json({ transcript: '' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({ transcript: '' });
    }

    const ai = getGenAI();
    let transcript = '';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: audioData,
            },
          },
          {
            text: 'Transcribe all spoken human words in this audio into clear plain text verbatim. Return ONLY the transcribed text. If no clear human speech is present in the audio: return [NO_SPEECH] if silent/no speech, return [BACKGROUND_NOISE] if background noise only, or return [UNCLEAR] if humming or mumbling. Do not include timestamp indicators like 00:00, brackets, quotes, or meta commentary.',
          },
        ],
      });
      transcript = response.text?.trim() || '';
    } catch (primaryErr: any) {
      console.log('Notice: Primary transcription model failed, trying fallback model...');
      try {
        const fallbackRes = await ai.models.generateContent({
          model: 'gemini-3.5-flash-lite',
          contents: [
            {
              inlineData: {
                mimeType: mimeType || 'audio/webm',
                data: audioData,
              },
            },
            {
              text: 'Transcribe all spoken human words in this audio into clear plain text verbatim. Return ONLY the transcribed text. If no clear human speech is present in the audio: return [NO_SPEECH] if silent/no speech, return [BACKGROUND_NOISE] if background noise only, or return [UNCLEAR] if humming or mumbling. Do not include timestamp indicators like 00:00, brackets, quotes, or meta commentary.',
            },
          ],
        });
        transcript = fallbackRes.text?.trim() || '';
      } catch (secondaryErr: any) {
        console.error('Fallback transcription model also failed:', secondaryErr?.message);
        transcript = '';
      }
    }

    return res.json({ transcript });
  } catch (err: any) {
    return res.json({ transcript: '' });
  }
});

// Configure Vite middleware in dev or static files in production
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
