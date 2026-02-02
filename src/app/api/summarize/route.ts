import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPTS = {
  de: `Du bist ein professioneller Assistent für strukturierte Textzusammenfassungen.
Analysiere die gesprochene Notiz und erstelle eine übersichtliche Zusammenfassung.

WICHTIG: Extrahiere die wichtigsten Informationen in einer strukturierten Form.

Regeln:
1. Erstelle einen kurzen, aussagekräftigen Titel (max. 50 Zeichen)
2. Extrahiere 3-5 Schlüsselpunkte (kurz und prägnant, max. 80 Zeichen pro Punkt)
3. Wenn Zahlen, Daten oder Fakten genannt werden, liste diese separat auf
4. Bestimme die Stimmung: positive, neutral oder negative
5. Wenn mehrere Sprecher erkennbar sind, versuche diese zu unterscheiden

Antworte NUR mit validem JSON:
{
  "title": "Kurzer Titel",
  "keyPoints": ["Punkt 1", "Punkt 2", "Punkt 3"],
  "facts": ["Fakt/Zahl 1", "Fakt/Zahl 2"],
  "speakers": ["Sprecher 1: Thema", "Sprecher 2: Thema"],
  "sentiment": "neutral",
  "summary": "Kurze Zusammenfassung in 1-2 Sätzen"
}`,

  en: `You are a professional assistant for structured text summarization.
Analyze the spoken note and create a clear, organized summary.

IMPORTANT: Extract the most important information in a structured form.

Rules:
1. Create a short, meaningful title (max 50 characters)
2. Extract 3-5 key points (brief and concise, max 80 characters each)
3. If numbers, dates or facts are mentioned, list them separately
4. Determine sentiment: positive, neutral, or negative
5. If multiple speakers are recognizable, try to distinguish them

Reply ONLY with valid JSON:
{
  "title": "Short Title",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "facts": ["Fact/Number 1", "Fact/Number 2"],
  "speakers": ["Speaker 1: Topic", "Speaker 2: Topic"],
  "sentiment": "neutral",
  "summary": "Brief summary in 1-2 sentences"
}`,

  bg: `Ти си професионален асистент за структурирано обобщаване на текстове.
Анализирай гласовата бележка и създай ясно, организирано обобщение.

ВАЖНО: Извлечи най-важната информация в структурирана форма.

Правила:
1. Създай кратко, смислено заглавие (макс. 50 символа)
2. Извлечи 3-5 ключови точки (кратки и ясни, макс. 80 символа всяка)
3. Ако са споменати числа, дати или факти, ги изброй отделно
4. Определи настроението: positive, neutral или negative
5. Ако са разпознаваеми няколко говорители, опитай се да ги разграничиш

Отговори САМО с валиден JSON:
{
  "title": "Кратко заглавие",
  "keyPoints": ["Точка 1", "Точка 2", "Точка 3"],
  "facts": ["Факт/Число 1", "Факт/Число 2"],
  "speakers": ["Говорител 1: Тема", "Говорител 2: Тема"],
  "sentiment": "neutral",
  "summary": "Кратко обобщение в 1-2 изречения"
}`
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
    if (!apiKey || apiKey === 'sk-proj-PASTE-YOUR-KEY-HERE') {
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
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Transkription:\n\n${transcript}` },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API Error:', errorData);
      return NextResponse.json({
        success: false,
        error: 'API_ERROR',
        message: errorData.error?.message || 'OpenAI API Fehler'
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

      // Build formatted summary with table-like structure
      let formattedSummary = '';

      // Key Points
      if (parsed.keyPoints && parsed.keyPoints.length > 0) {
        formattedSummary += '📋 WICHTIGSTE PUNKTE:\n';
        parsed.keyPoints.forEach((point: string, i: number) => {
          formattedSummary += `  ${i + 1}. ${point}\n`;
        });
        formattedSummary += '\n';
      }

      // Facts/Numbers
      if (parsed.facts && parsed.facts.length > 0) {
        formattedSummary += '📊 FAKTEN & ZAHLEN:\n';
        parsed.facts.forEach((fact: string) => {
          formattedSummary += `  • ${fact}\n`;
        });
        formattedSummary += '\n';
      }

      // Speakers (if detected)
      if (parsed.speakers && parsed.speakers.length > 1) {
        formattedSummary += '👥 SPRECHER:\n';
        parsed.speakers.forEach((speaker: string) => {
          formattedSummary += `  • ${speaker}\n`;
        });
        formattedSummary += '\n';
      }

      // Brief summary
      if (parsed.summary) {
        formattedSummary += '💡 FAZIT:\n';
        formattedSummary += `  ${parsed.summary}`;
      }

      return NextResponse.json({
        success: true,
        title: parsed.title || transcript.substring(0, 50) + '...',
        summary: formattedSummary.trim() || parsed.summary || transcript.substring(0, 200),
        sentiment: parsed.sentiment || 'neutral',
        keyPoints: parsed.keyPoints || [],
        facts: parsed.facts || [],
        speakers: parsed.speakers || [],
      });
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError, 'Content:', content);
      // If JSON parsing fails, use content as summary
      return NextResponse.json({
        success: true,
        title: transcript.substring(0, 50) + '...',
        summary: content,
        sentiment: 'neutral',
        keyPoints: [],
        facts: [],
        speakers: [],
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
