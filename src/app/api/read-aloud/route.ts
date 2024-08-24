import { NextRequest, NextResponse } from 'next/server';
import { franc } from 'franc';
import iso6393to1 from 'iso-639-3-to-1';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  let outputFile = '';

  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Detect the language using franc
    const langCode = franc(message);
    const iso6391Code = iso6393to1(langCode) || 'en';

    // Configure Azure Speech SDK
    const speechKey = process.env.AZURE_SPEECH_KEY;
    const serviceRegion = process.env.AZURE_REGION;

    if (!speechKey || !serviceRegion) {
      return NextResponse.json({ error: 'Azure Speech API credentials are not set' }, { status: 500 });
    }

    const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, serviceRegion);
    let voiceName = 'en-IN-PrabhatNeural';

    switch (iso6391Code) {
      case 'hi':
        voiceName = 'hi-IN-MadhurNeural';
        break;
      case 'gu':
        voiceName = 'gu-IN-NiranjanNeural';
        break;
      // Add more cases for additional languages
    }

    speechConfig.speechSynthesisVoiceName = voiceName;
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

    outputFile = path.join(process.cwd(), `speech_${uuidv4()}.mp3`);
    const audioConfig = sdk.AudioConfig.fromAudioFileOutput(outputFile);

    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    // Synthesize the speech
    const result = await new Promise<sdk.SpeechSynthesisResult>((resolve, reject) => {
      synthesizer.speakTextAsync(
        message,
        (res) => {
          if (res.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            resolve(res);
          } else {
            reject(new Error('Speech synthesis failed'));
          }
        },
        (error) => reject(error)
      );
    });

    await fs.chmod(outputFile, '777');

    // Read the synthesized file and return it
    const audioBuffer = await fs.readFile(outputFile);

    // Schedule the file deletion in the background
    setTimeout(async () => {
      try {
        await fs.unlink(outputFile);
        console.log('File deleted successfully');
      } catch (unlinkError) {
        console.error('Error deleting the output file:', unlinkError);
      }
    }, 5000); // 5-second delay before deletion

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('Error processing the request:', error);
    return NextResponse.json({ error: 'An error occurred while processing the request' }, { status: 500 });
  }
}
