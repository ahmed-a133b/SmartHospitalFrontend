# 🎙️ Smart Hospital Voice Assistant

The Smart Hospital Assistant now includes advanced voice capabilities powered by both Web Speech API and Google Cloud Text-to-Speech.

## ✨ Features

### 🔊 Text-to-Speech (TTS)
- **Automatic voice responses** - Assistant speaks back when you ask questions
- **Dual TTS engines**:
  - **Web Speech API** (Built-in, free, works offline)
  - **Google Cloud TTS** (High-quality neural voices, requires API key)
- **Voice controls** - Toggle voice on/off, adjust speed and pitch
- **Smart text processing** - Cleans markdown formatting and technical terms for better speech

### 🎤 Speech Recognition
- **Voice input** - Ask questions using your microphone
- **Real-time transcription** - See what you're saying as you speak
- **Hands-free operation** - Perfect for busy healthcare environments

## 🚀 Quick Start

1. **Open the Smart Hospital Assistant** (floating chat button)
2. **Voice is enabled by default** - The assistant will speak responses
3. **Toggle voice** with the 🔊/🔇 button
4. **Configure settings** with the ⚙️ button

## 🔧 Configuration

### Basic Setup (Web Speech API)
No setup required! Uses your browser's built-in text-to-speech.

### Advanced Setup (Google Cloud TTS)
For higher quality neural voices:

1. **Get Google Cloud API Key** (see VOICE_SETUP.md for details)
2. **Open voice settings** (⚙️ button in chat)
3. **Enable Google Cloud TTS** checkbox
4. **Enter your API key**
5. **Test the voice** with the "Test Voice" button

### Voice Settings
- **Speed**: 0.5x to 2.0x (default: 1.0x)
- **Pitch**: 0.5 to 1.5 (default: 1.0)
- **Voice Quality**: Web API vs Google Cloud TTS

## 💡 Usage Examples

### Voice Commands
- *"Show critical patients"*
- *"What are the vitals for room 101?"*
- *"Show environmental data for room 202"*
- *"Are there any high priority alerts?"*

### Text Queries
- Type any question in the chat input
- Assistant responds with both text and voice
- Voice response automatically cleans formatting for better speech

## 🛠️ Technical Details

### Text Processing
The voice assistant automatically:
- Removes markdown formatting (`**bold**`, `*italic*`, etc.)
- Removes emojis for cleaner speech
- Converts technical symbols (°C, %, bpm, etc.) to words
- Cleans bullet points and numbered lists

### Fallback System
- If Google Cloud TTS fails → Falls back to Web Speech API
- If voice is disabled → Text-only responses
- If speech recognition fails → Manual text input still works

### Browser Compatibility
- **Voice Output**: All modern browsers
- **Voice Input**: Chrome, Safari, Edge (limited Firefox)
- **Google Cloud TTS**: All browsers with Web Audio API

## 🔒 Security & Privacy

- **API Keys**: Stored locally in browser session (not persistent)
- **Voice Data**: Speech recognition uses browser APIs (not sent to external servers unless using Google TTS)
- **Google TTS**: Audio generated server-side, returned as base64 audio
- **Recommendations**: Use API key restrictions in Google Cloud Console

## 📊 Cost Information

### Web Speech API
- **Cost**: Free
- **Quality**: Basic to good (varies by browser/OS)
- **Offline**: Yes (after initial load)

### Google Cloud TTS
- **Free Tier**: 1 million characters/month
- **Standard Voices**: $4/million characters
- **Neural Voices**: $16/million characters
- **Typical Usage**: Free tier sufficient for most hospital scenarios

## 🐛 Troubleshooting

### No Voice Output
1. Check browser volume settings
2. Verify voice toggle is enabled (🔊 icon)
3. Try test voice in settings
4. Check browser audio permissions

### Poor Voice Quality
1. Switch between Web API and Google TTS
2. Adjust speed/pitch settings
3. Check network connection for Google TTS

### Voice Recognition Issues
1. Check microphone permissions
2. Ensure quiet environment
3. Speak clearly and at normal pace
4. Try refreshing the page

### API Key Issues
1. Verify API key is correct
2. Check Text-to-Speech API is enabled in Google Cloud
3. Verify billing is enabled on Google Cloud project
4. Check API usage quotas

## 🔄 Updates & Maintenance

The voice system is designed to be:
- **Self-updating**: New voice improvements automatically available
- **Backward compatible**: Works with existing chat functionality
- **Extensible**: Easy to add new voices or languages

## 🎯 Future Enhancements

Planned features:
- Multiple language support
- Custom wake words
- Voice-only mode for hands-free operation
- Emotion/tone detection in voice
- Voice shortcuts for common queries

## 📞 Support

For voice-related issues:
1. Check this documentation
2. Review browser console for errors
3. Test with different browsers
4. Verify API keys and permissions

The voice assistant enhances the hospital management experience by providing natural, conversational interaction with the system data.
