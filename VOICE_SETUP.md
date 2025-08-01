# Google Cloud Text-to-Speech Setup Guide

## Prerequisites

1. **Google Cloud Project**: You need a Google Cloud Project with billing enabled
2. **Text-to-Speech API**: Enable the Text-to-Speech API in your project
3. **API Key**: Create an API key with Text-to-Speech API permissions

## Setup Steps

### 1. Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable billing for the project

### 2. Enable Text-to-Speech API
1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Cloud Text-to-Speech API"
3. Click on it and press "Enable"

### 3. Create an API Key
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the generated API key
4. (Optional) Restrict the API key to only Text-to-Speech API for security

### 4. Configure in the App
1. Open the Smart Hospital Assistant chat
2. Click the settings icon (⚙️) in the chat input area
3. Check "Use Google Cloud Text-to-Speech"
4. Paste your API key in the "Google Cloud TTS API Key" field
5. Adjust voice speed and pitch as desired
6. Click "Test Voice" to verify it's working

## Voice Features

### Available Controls
- **Voice Toggle**: Enable/disable voice responses
- **Settings Panel**: Configure voice parameters
- **Speed Control**: Adjust speaking rate (0.5x to 2.0x)
- **Pitch Control**: Adjust voice pitch (0.5 to 1.5)
- **Test Voice**: Preview voice settings

### Fallback Behavior
- If Google Cloud TTS fails or is not configured, the system automatically falls back to the browser's built-in Web Speech API
- Web Speech API provides basic text-to-speech functionality without requiring external services

## Cost Considerations

Google Cloud TTS pricing (as of 2024):
- First 1 million characters per month: Free
- Additional characters: $4.00 per 1 million characters
- Neural voices: $16.00 per 1 million characters

For typical hospital assistant usage, the free tier should be sufficient.

## Troubleshooting

### Common Issues
1. **No voice output**: Check if voice is enabled and browser allows audio
2. **API errors**: Verify API key and that Text-to-Speech API is enabled
3. **Poor quality**: Try switching between Google TTS and Web Speech API
4. **Rate limits**: Google TTS has usage quotas; consider implementing caching for repeated phrases

### Browser Compatibility
- **Web Speech API**: Supported in Chrome, Safari, Edge (limited Firefox support)
- **Google Cloud TTS**: Works in all modern browsers that support Web Audio API

## Security Notes

- API keys should be restricted to Text-to-Speech API only
- Consider using environment variables for API keys in production
- Monitor API usage in Google Cloud Console
- Rotate API keys periodically

## Advanced Configuration

### Custom Voice Selection
You can modify the TTS service to use different Google Cloud voices:

```typescript
// In textToSpeechService.ts, modify the voice configuration:
voice: {
  languageCode: 'en-US',
  name: 'en-US-Studio-O', // High-quality neural voice
  ssmlGender: 'FEMALE'
}
```

Available voices include:
- `en-US-Studio-O` (Female, Neural, High Quality)
- `en-US-Studio-M` (Male, Neural, High Quality)
- `en-US-Wavenet-A` (Female, WaveNet)
- `en-US-Wavenet-B` (Male, WaveNet)

### SSML Support
The service can be extended to support SSML (Speech Synthesis Markup Language) for more control over speech:

```typescript
input: {
  ssml: `<speak>Hello <break time="1s"/> Doctor</speak>`
}
```
