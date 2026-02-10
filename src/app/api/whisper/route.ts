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

    if (!apiKey || apiKey === 'sk-proj-PASTE-YOUR-KEY-HERE') {
      return NextResponse.json({
        success: false,
        error: 'NO_API_KEY',
        message: 'OpenAI API Key wird für Whisper Transkription benötigt. Füge OPENAI_API_KEY in .env.local ein.'
      }, { status: 400 });
    }

    // Determine file extension from file type
    const fileType = audioFile.type || 'audio/webm';
    const fileExtension = fileType.includes('mp4') ? 'mp4' :
                          fileType.includes('ogg') ? 'ogg' :
                          fileType.includes('wav') ? 'wav' :
                          fileType.includes('mpeg') ? 'mp3' : 'webm';

    // Create FormData for OpenAI API
    const openAIFormData = new FormData();
    openAIFormData.append('file', audioFile, `audio.${fileExtension}`);
    openAIFormData.append('model', 'whisper-1');
    openAIFormData.append('language', language === 'de' ? 'de' : language === 'bg' ? 'bg' : 'en');
    openAIFormData.append('response_format', 'verbose_json');
    openAIFormData.append('timestamp_granularities[]', 'segment');

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
        message: errorData.error?.message || 'Whisper API Fehler'
      }, { status: 500 });
    }

    const data = await response.json();

    // Extract segments with timestamps
    const segments = data.segments?.map((seg: { start: number; end: number; text: string }) => ({
      timestamp: Math.floor(seg.start),
      text: seg.text.trim(),
    })) || [];

    return NextResponse.json({
      success: true,
      transcript: data.text,
      segments,
      language: data.language,
      duration: data.duration,
    });

  } catch (error) {
    console.error('Whisper transcription error:', error);
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Interner Fehler bei der Transkription'
    }, { status: 500 });
  }
}
