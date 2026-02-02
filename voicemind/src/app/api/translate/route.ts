import { NextRequest, NextResponse } from 'next/server';

const LANGUAGE_NAMES: Record<string, string> = {
  de: 'German',
  en: 'English',
  bg: 'Bulgarian',
};

export async function POST(request: NextRequest) {
  try {
    const { segments, targetLanguage, sourceLanguage } = await request.json();

    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No segments provided'
      }, { status: 400 });
    }

    if (!targetLanguage) {
      return NextResponse.json({
        success: false,
        error: 'No target language specified'
      }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'NO_API_KEY',
        message: 'Translation requires an OpenAI API key. Add OPENAI_API_KEY to .env.local'
      });
    }

    const targetLangName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
    const sourceLangName = sourceLanguage ? (LANGUAGE_NAMES[sourceLanguage] || sourceLanguage) : 'the original language';

    // Translate each segment individually to ensure fresh translations
    // This fixes the translation mismatch bug by giving each segment its own translation
    const translatedSegments = await Promise.all(
      segments.map(async (segment: any) => {
        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
              messages: [
                {
                  role: 'system',
                  content: `You are a professional translator. Translate the following text from ${sourceLangName} to ${targetLangName}.
                           Maintain the original meaning, tone, and context.
                           Only return the translated text, nothing else.`
                },
                {
                  role: 'user',
                  content: segment.text
                }
              ],
              temperature: 0.3,
              max_tokens: 1000,
            }),
          });

          if (!response.ok) {
            console.error('Translation API error for segment:', segment.id);
            return {
              ...segment,
              translatedText: segment.text, // Fallback to original
              targetLanguage,
              translationError: true,
            };
          }

          const data = await response.json();
          const translatedText = data.choices?.[0]?.message?.content?.trim();

          return {
            ...segment,
            translatedText: translatedText || segment.text,
            targetLanguage,
            translationError: false,
          };
        } catch (error) {
          console.error('Error translating segment:', segment.id, error);
          return {
            ...segment,
            translatedText: segment.text,
            targetLanguage,
            translationError: true,
          };
        }
      })
    );

    // Combine all translated text
    const fullTranslatedText = translatedSegments
      .map(seg => seg.translatedText)
      .join(' ');

    return NextResponse.json({
      success: true,
      segments: translatedSegments,
      fullTranslatedText,
      targetLanguage,
      sourceLanguage: sourceLanguage || 'auto',
    });

  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
