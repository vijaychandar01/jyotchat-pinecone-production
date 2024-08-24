import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message) {
      console.error('Invalid input: message is missing.');
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Configure Azure Translator API
    const translatorKey = process.env.AZURE_TRANSLATOR_KEY;
    const translatorEndpoint = "https://api.cognitive.microsofttranslator.com";
    const translatorRegion = process.env.AZURE_REGION;

    if (!translatorKey || !translatorRegion) {
      console.error('Azure Translator API credentials are not set.');
      return NextResponse.json({ error: 'Azure Translator API credentials are not set' }, { status: 500 });
    }

    // Log before sending the request
    console.log('Sending request to Azure Translator API...');
    const response = await axios({
      baseURL: translatorEndpoint,
      url: '/translate',
      method: 'post',
      headers: {
        'Ocp-Apim-Subscription-Key': translatorKey,
        'Ocp-Apim-Subscription-Region': translatorRegion,
        'Content-type': 'application/json',
        'X-ClientTraceId': uuidv4().toString(),
      },
      params: {
        'api-version': '3.0',
        'to': 'en', // Always translate to English
      },
      data: [{
        'text': message
      }],
      responseType: 'json'
    });

    // Extract and return translations
    const translations = response.data[0].translations.map((translation: any) => ({
      text: translation.text,
      to: translation.to
    }));

    console.log('Translation successful:', translations);
    return NextResponse.json({ translations }, { status: 200 });

  } catch (error) {
    console.error('Error processing the request:', error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', error.response?.data || error.message);
    }
    return NextResponse.json({ error: 'An error occurred while processing the request' }, { status: 500 });
  }
}
