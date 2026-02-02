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
        message: 'Whisper requires an OpenAI API key. Add OPENAI_API_KEY to .env.local'
      });
    }

    // Prepare form data for Whisper API
    const whisperFormData = new FormData();
    whisperFormData.append('file', audioFile);
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', language);
    whisperFormData.append('response_format', 'verbose_json');
    whisperFormData.append('timestamp_granularities[]', 'segment');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: whisperFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Whisper API Error:', errorData);
      return NextResponse.json({
        success: false,
        error: 'WHISPER_API_ERROR',
        message: errorData.error?.message || 'Whisper transcription failed'
      }, { status: 500 });
    }

    const data = await response.json();

    // Transform Whisper segments to our format
    const segments = (data.segments || []).map((seg: any, index: number) => ({
      id: `seg_${Date.now()}_${index}`,
      start: seg.start,
      end: seg.end,
      text: seg.text.trim(),
      language: data.language || language,
    }));

    return NextResponse.json({
      success: true,
      text: data.text,
      segments,
      language: data.language || language,
      duration: data.duration,
    });

  } catch (error) {
    console.error('Whisper transcription error:', error);
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
