import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPTS = {
  de: `Du bist ein professioneller Assistent für Textzusammenfassungen. 
Erstelle eine prägnante Zusammenfassung der gesprochenen Notiz.

Regeln:
1. Fasse die Hauptpunkte in 2-4 Sätzen zusammen
2. Behalte die wichtigsten Informationen
3. Erstelle einen kurzen, aussagekräftigen Titel (max. 60 Zeichen)
4. Bestimme die Stimmung: positive, neutral oder negative

Antworte NUR mit validem JSON:
{"title": "...", "summary": "...", "sentiment": "neutral"}`,

  en: `You are a professional text summarization assistant.
Create a concise summary of the spoken note.

Rules:
1. Summarize main points in 2-4 sentences
2. Keep the most important information
3. Create a short, meaningful title (max 60 characters)
4. Determine sentiment: positive, neutral, or negative

Reply ONLY with valid JSON:
{"title": "...", "summary": "...", "sentiment": "neutral"}`,

  bg: `Ти си професионален асистент за обобщаване на текстове.
Създай кратко обобщение на гласовата бележка.

Правила:
1. Обобщи основните точки в 2-4 изречения
2. Запази най-важната информация
3. Създай кратко, смислено заглавие (макс. 60 символа)
4. Определи настроението: positive, neutral или negative

Отговори САМО с валиден JSON:
{"title": "...", "summary": "...", "sentiment": "neutral"}`
};

export async function POST(request: NextRequest) {
  try {
    const { transcript, language = 'de' } = await request.json();

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No transcript provided'
      }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    
    // Wenn kein API Key, gib Hinweis zurück
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'NO_API_KEY',
        message: 'Für KI-Zusammenfassungen wird ein OpenAI API Key benötigt. Füge OPENAI_API_KEY in .env.local ein.'
      });
    }

    const systemPrompt = SYSTEM_PROMPTS[language as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS.de;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Transkription:\n\n${transcript}` },
        ],
        temperature: 0.5,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API Error:', errorData);
      return NextResponse.json({
        success: false,
        error: 'API_ERROR',
        message: 'OpenAI API Fehler'
      }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({
        success: false,
        error: 'NO_CONTENT'
      }, { status: 500 });
    }

    // Parse JSON response
    try {
      // Clean the response (remove markdown code blocks if present)
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/```json?\n?/g, '').replace(/```/g, '');
      }
      
      const parsed = JSON.parse(cleanContent);
      
      return NextResponse.json({
        success: true,
        title: parsed.title || transcript.substring(0, 50) + '...',
        summary: parsed.summary || transcript,
        sentiment: parsed.sentiment || 'neutral',
      });
    } catch (parseError) {
      // If JSON parsing fails, use content as summary
      return NextResponse.json({
        success: true,
        title: transcript.substring(0, 50) + '...',
        summary: content,
        sentiment: 'neutral',
      });
    }

  } catch (error) {
    console.error('Summarization error:', error);
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
