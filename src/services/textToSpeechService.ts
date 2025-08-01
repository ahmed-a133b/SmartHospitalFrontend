// Text-to-Speech Service for Smart Hospital Assistant
// This service provides both Web Speech API (built-in) and Google Cloud TTS functionality

interface TTSConfig {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: string;
  useGoogleTTS?: boolean;
  googleAPIKey?: string;
}

interface GoogleTTSRequest {
  input: {
    text: string;
  };
  voice: {
    languageCode: string;
    name?: string;
    ssmlGender?: 'NEUTRAL' | 'FEMALE' | 'MALE';
  };
  audioConfig: {
    audioEncoding: 'MP3' | 'LINEAR16' | 'OGG_OPUS';
    speakingRate?: number;
    pitch?: number;
    volumeGainDb?: number;
  };
}

class TextToSpeechService {
  private config: TTSConfig;
  private synth: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private audioContext: AudioContext | null = null;
  private isPlaying: boolean = false;

  constructor(config: TTSConfig = {}) {
    // Get environment variables with fallbacks
    const getEnvVar = (key: string, fallback: string = '') => {
      try {
        return (window as any)?.process?.env?.[key] || fallback;
      } catch {
        return fallback;
      }
    };

    this.config = {
      rate: parseFloat(getEnvVar('REACT_APP_TTS_DEFAULT_RATE', '1.0')),
      pitch: parseFloat(getEnvVar('REACT_APP_TTS_DEFAULT_PITCH', '1.0')),
      volume: 1.0,
      voice: getEnvVar('REACT_APP_TTS_DEFAULT_VOICE', 'en-US-Studio-O'),
      useGoogleTTS: false,
      googleAPIKey: getEnvVar('REACT_APP_GOOGLE_TTS_API_KEY'),
      ...config
    };
    
    this.synth = window.speechSynthesis;
  }

  // Update configuration
  updateConfig(newConfig: Partial<TTSConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  // Get available voices (Web Speech API)
  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.synth.getVoices();
  }

  // Stop current speech
  stop() {
    if (this.synth.speaking) {
      this.synth.cancel();
    }
    if (this.currentUtterance) {
      this.currentUtterance = null;
    }
    this.isPlaying = false;
  }

  // Check if currently speaking
  isSpeaking(): boolean {
    return this.isPlaying || this.synth.speaking;
  }

  // Speak text using Web Speech API
  async speakWithWebAPI(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!text.trim()) {
        resolve();
        return;
      }

      // Stop any current speech
      this.stop();

      // Clean the text for better speech synthesis
      const cleanText = this.cleanTextForSpeech(text);
      
      this.currentUtterance = new SpeechSynthesisUtterance(cleanText);
      
      // Configure utterance
      this.currentUtterance.rate = this.config.rate || 1.0;
      this.currentUtterance.pitch = this.config.pitch || 1.0;
      this.currentUtterance.volume = this.config.volume || 1.0;
      
      // Set voice if specified
      if (this.config.voice) {
        const voices = this.getAvailableVoices();
        const selectedVoice = voices.find(voice => 
          voice.name.includes(this.config.voice!) || 
          voice.lang.includes(this.config.voice!)
        );
        if (selectedVoice) {
          this.currentUtterance.voice = selectedVoice;
        }
      }

      // Event handlers
      this.currentUtterance.onstart = () => {
        this.isPlaying = true;
      };

      this.currentUtterance.onend = () => {
        this.isPlaying = false;
        this.currentUtterance = null;
        resolve();
      };

      this.currentUtterance.onerror = (event) => {
        this.isPlaying = false;
        this.currentUtterance = null;
        console.error('Speech synthesis error:', event);
        reject(new Error('Speech synthesis failed'));
      };

      // Start speaking
      this.synth.speak(this.currentUtterance);
    });
  }

  // Speak text using Google Cloud TTS
  async speakWithGoogleTTS(text: string): Promise<void> {
    if (!this.config.googleAPIKey) {
      throw new Error('Google Cloud TTS API key not configured');
    }

    if (!text.trim()) {
      return;
    }

    try {
      // Stop any current speech
      this.stop();

      // Clean the text for better speech synthesis
      const cleanText = this.cleanTextForSpeech(text);

      // Prepare the request
      const request: GoogleTTSRequest = {
        input: {
          text: cleanText
        },
        voice: {
          languageCode: 'en-US',
          name: 'en-US-Studio-O', // High-quality neural voice
          ssmlGender: 'FEMALE'
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: this.config.rate || 1.0,
          pitch: (this.config.pitch || 1.0 - 1.0) * 20, // Convert to Google's range (-20 to 20)
          volumeGainDb: this.config.volume ? (this.config.volume - 1.0) * 16 : 0 // Convert to dB
        }
      };

      // Call Google Cloud TTS API
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.config.googleAPIKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request)
        }
      );

      if (!response.ok) {
        throw new Error(`Google TTS API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.audioContent) {
        throw new Error('No audio content received from Google TTS');
      }

      // Convert base64 to audio and play
      await this.playBase64Audio(data.audioContent);

    } catch (error) {
      console.error('Google TTS error:', error);
      // Fallback to Web Speech API
      console.log('Falling back to Web Speech API');
      await this.speakWithWebAPI(text);
    }
  }

  // Play base64 encoded audio
  private async playBase64Audio(base64Audio: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create audio context if needed
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        // Convert base64 to array buffer
        const binaryString = atob(base64Audio);
        const arrayBuffer = new ArrayBuffer(binaryString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        
        for (let i = 0; i < binaryString.length; i++) {
          uint8Array[i] = binaryString.charCodeAt(i);
        }

        // Decode audio data
        this.audioContext.decodeAudioData(arrayBuffer)
          .then(audioBuffer => {
            // Create audio source
            const source = this.audioContext!.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext!.destination);

            this.isPlaying = true;

            source.onended = () => {
              this.isPlaying = false;
              resolve();
            };

            // Play the audio
            source.start(0);
          })
          .catch(error => {
            this.isPlaying = false;
            reject(error);
          });

      } catch (error) {
        this.isPlaying = false;
        reject(error);
      }
    });
  }

  // Clean text for better speech synthesis
  private cleanTextForSpeech(text: string): string {
    return text
      // Remove markdown formatting
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
      .replace(/\*(.*?)\*/g, '$1') // Italic
      .replace(/__(.*?)__/g, '$1') // Underline
      .replace(/~~(.*?)~~/g, '$1') // Strikethrough
      .replace(/`(.*?)`/g, '$1') // Inline code
      .replace(/```[\s\S]*?```/g, '') // Code blocks
      
      // Remove emojis and special characters for better pronunciation
      .replace(/[🔴🟠🟡🟢🚨⚠️ℹ️📊❤️🩸🌡️🫁💨⏰🏥👤📋]/g, '')
      .replace(/[📢🔍✅❌⏱️🌐💡]/g, '')
      
      // Replace common symbols with words
      .replace(/°C/g, 'degrees Celsius')
      .replace(/°F/g, 'degrees Fahrenheit')
      .replace(/%/g, 'percent')
      .replace(/bpm/g, 'beats per minute')
      .replace(/mmHg/g, 'millimeters of mercury')
      .replace(/ppm/g, 'parts per million')
      .replace(/dB/g, 'decibels')
      .replace(/lux/g, 'lux')
      
      // Handle bullet points and numbers
      .replace(/^•\s*/gm, '') // Remove bullet points
      .replace(/^\d+\.\s*/gm, '') // Remove numbered list items
      
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Main speak method - chooses between Web API and Google TTS
  async speak(text: string): Promise<void> {
    if (this.config.useGoogleTTS && this.config.googleAPIKey) {
      await this.speakWithGoogleTTS(text);
    } else {
      await this.speakWithWebAPI(text);
    }
  }
}

// Create singleton instance
export const ttsService = new TextToSpeechService();

// Export the class for custom instances
export default TextToSpeechService;

// Utility function to initialize with Google Cloud credentials
export const initializeGoogleTTS = (apiKey: string) => {
  ttsService.updateConfig({
    useGoogleTTS: true,
    googleAPIKey: apiKey,
    voice: 'en-US-Studio-O' // High-quality neural voice
  });
};

// Utility function to set voice preferences
export const setVoicePreferences = (config: Partial<TTSConfig>) => {
  ttsService.updateConfig(config);
};
