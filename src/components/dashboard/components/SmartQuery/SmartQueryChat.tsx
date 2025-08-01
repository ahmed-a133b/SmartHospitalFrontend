import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Loader, Volume2, VolumeX, Settings } from 'lucide-react';
import { processChatQuery } from '../../../../services/queryService';
import { ttsService, initializeGoogleTTS, setVoicePreferences } from '../../../../services/textToSpeechService';

// TypeScript declarations for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface ChatMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
  data?: any;
}

const SmartQueryChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [googleAPIKey, setGoogleAPIKey] = useState('');
  const [useGoogleTTS, setUseGoogleTTS] = useState(false);
  const [voiceRate, setVoiceRate] = useState(1.0);
  const [voicePitch, setVoicePitch] = useState(1.0);
  const recognition = useRef<any>(null);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    // Initialize speech recognition
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      
      recognition.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        
        setInput(transcript);
      };
      
      recognition.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };
    }
    
    // Add welcome message
    const welcomeMessage = {
      text: "👋 Hello! I'm your Smart Hospital Assistant with voice capabilities! \n\n🎙️ **Voice Features:**\n• I can speak responses back to you\n• Click the 🔊 icon to toggle voice on/off\n• Click ⚙️ to configure voice settings\n• Use Google Cloud TTS for higher quality voice\n\n💬 **I can help you with:**\n• Patient information and vitals\n• Room status and environmental data\n• Alerts and risk assessments\n\nTry asking me something like 'Show critical patients' or 'Show vitals for room 1'!", 
      isUser: false, 
      timestamp: new Date() 
    };
    
    setMessages([welcomeMessage]);
    
    // Speak welcome message if voice is enabled
    setTimeout(() => {
      if (voiceEnabled) {
        speakMessage("Hello! I'm your Smart Hospital Assistant. I can help you with patient information, room status, and alerts. You can ask me questions using voice or text.");
      }
    }, 1000);
    
    return () => {
      if (recognition.current) {
        recognition.current.stop();
      }
    };
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize TTS service with settings
  useEffect(() => {
    if (googleAPIKey) {
      initializeGoogleTTS(googleAPIKey);
    }
    
    setVoicePreferences({
      rate: voiceRate,
      pitch: voicePitch,
      useGoogleTTS: useGoogleTTS && !!googleAPIKey
    });
  }, [googleAPIKey, useGoogleTTS, voiceRate, voicePitch]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const speakMessage = async (text: string) => {
    if (!voiceEnabled) return;
    
    try {
      setIsSpeaking(true);
      await ttsService.speak(text);
    } catch (error) {
      console.error('Error speaking message:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    ttsService.stop();
    setIsSpeaking(false);
  };

  const toggleVoice = () => {
    if (ttsService.isSpeaking()) {
      stopSpeaking();
    }
    setVoiceEnabled(!voiceEnabled);
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognition.current?.stop();
      setIsRecording(false);
    } else {
      try {
        recognition.current?.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Speech recognition error:', err);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = {
      text: input,
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);
    
    try {
      const response = await processChatQuery(input.trim());
      
      const assistantMessage = {
        text: response.message,
        isUser: false,
        timestamp: new Date(),
        data: response.data
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Speak the assistant's response if voice is enabled
      if (voiceEnabled) {
        setTimeout(() => speakMessage(response.message), 100);
      }
    } catch (error) {
      console.error('Error processing query:', error);
      
      let errorMsg = "I'm sorry, I couldn't process that request. ";
      if (error instanceof Error) {
        if (error.message.includes('timed out')) {
          errorMsg += "The request timed out. Please try again.";
        } else if (error.message.includes('Failed to fetch')) {
          errorMsg += "I couldn't connect to the hospital database. Please check if the server is running.";
        } else {
          errorMsg += "Please try rephrasing your question or ask for help.";
        }
      } else {
        errorMsg += "Please try again or ask for help to see available commands.";
      }
      
      setMessages(prev => [...prev, {
        text: errorMsg,
        isUser: false,
        timestamp: new Date()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div key={index}>
              <div className={`max-w-[80%] p-3 rounded-lg break-words ${
                message.isUser 
                  ? 'bg-blue-100 ml-auto rounded-tr-sm' 
                  : 'bg-white mr-auto rounded-tl-sm border'
              }`}>
                <div className="text-xs font-semibold text-gray-600 mb-1">
                  {message.isUser ? 'You' : 'Assistant'}
                </div>
                <div className="text-sm text-gray-900 whitespace-pre-line">{message.text}</div>
                
                {message.data && (
                  <div className="mt-3 p-3 bg-gray-100 rounded border max-h-48 overflow-y-auto">
                    {Array.isArray(message.data) ? (
                      <div className="space-y-2">
                        {message.data.map((item, i) => (
                          <div key={i} className="bg-white p-2 rounded text-xs">
                            {typeof item === 'object' 
                              ? Object.entries(item).map(([key, value]) => (
                                <div key={key} className="text-gray-700">
                                  <span className="font-medium">{key}:</span> {String(value)}
                                </div>
                              ))
                              : String(item)
                            }
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-700">
                        {JSON.stringify(message.data)}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="text-xs text-gray-500 text-right mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div ref={messagesEndRef} />
      </div>
      
      <div className="flex p-4 bg-white border-t border-gray-200 space-x-2">
        {/* Voice Settings Button */}
        <button
          onClick={() => setShowVoiceSettings(!showVoiceSettings)}
          className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Voice settings"
        >
          <Settings className="h-5 w-5" />
        </button>
        
        {/* Voice Toggle Button */}
        <button
          onClick={toggleVoice}
          className={`p-2 rounded-lg transition-colors ${
            voiceEnabled 
              ? 'text-green-600 hover:text-green-700 hover:bg-green-50' 
              : 'text-gray-400 hover:text-gray-500 hover:bg-gray-100'
          } ${isSpeaking ? 'animate-pulse' : ''}`}
          title={voiceEnabled ? 'Voice enabled (click to disable)' : 'Voice disabled (click to enable)'}
        >
          {voiceEnabled && !isSpeaking ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
        
        <div className="flex-1 relative">
          <input
            type="text"
            className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Ask about patients, rooms, or alerts..."
            value={input}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            disabled={isProcessing}
          />
          <button
            onClick={toggleRecording}
            disabled={!recognition.current}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title={isRecording ? 'Stop recording' : 'Start voice recording'}
          >
            {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
        </div>
        <button
          onClick={handleSendMessage}
          disabled={!input.trim() || isProcessing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[60px]"
          title="Send message"
        >
          {isProcessing ? <Loader className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </div>
      
      {/* Voice Settings Panel */}
      {showVoiceSettings && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Voice Settings</h4>
          
          {/* Google TTS Toggle */}
          <div className="mb-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={useGoogleTTS}
                onChange={(e) => setUseGoogleTTS(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Use Google Cloud Text-to-Speech (higher quality)</span>
            </label>
          </div>
          
          {/* Google API Key Input */}
          {useGoogleTTS && (
            <div className="mb-3">
              <label className="block text-xs text-gray-600 mb-1">Google Cloud TTS API Key</label>
              <input
                type="password"
                value={googleAPIKey}
                onChange={(e) => setGoogleAPIKey(e.target.value)}
                placeholder="Enter your Google Cloud TTS API key"
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get your API key from Google Cloud Console → Text-to-Speech API
              </p>
            </div>
          )}
          
          {/* Voice Speed */}
          <div className="mb-3">
            <label className="block text-xs text-gray-600 mb-1">Speed: {voiceRate.toFixed(1)}x</label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={voiceRate}
              onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          
          {/* Voice Pitch */}
          <div className="mb-3">
            <label className="block text-xs text-gray-600 mb-1">Pitch: {voicePitch.toFixed(1)}</label>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={voicePitch}
              onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          
          {/* Test Voice Button */}
          <button
            onClick={() => speakMessage("Hello! This is a test of the voice assistant. How does this sound?")}
            disabled={isSpeaking}
            className="w-full px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSpeaking ? 'Speaking...' : 'Test Voice'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SmartQueryChat;