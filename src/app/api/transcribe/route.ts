import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string || 'de';

    if (!audioFile) {
      return NextResponse.json({
        success: false,
        error: 'No audio file provided'
      }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'NO_API_KEY',
        message: 'Whisper AI requires an OpenAI API Key. Add OPENAI_API_KEY to .env.local'
      });
    }

    // Create form data for OpenAI
    const openAIFormData = new FormData();
    openAIFormData.append('file', audioFile);
    openAIFormData.append('model', 'whisper-1');
    openAIFormData.append('language', language);
    openAIFormData.append('response_format', 'json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: openAIFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Whisper API Error:', errorData);
      return NextResponse.json({
        success: false,
        error: 'API_ERROR',
        message: errorData.error?.message || 'Whisper API error'
      }, { status: 500 });
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      transcript: data.text,
      language: language,
    });

  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to transcribe audio'
    }, { status: 500 });
  }
}

// Configuration for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};
