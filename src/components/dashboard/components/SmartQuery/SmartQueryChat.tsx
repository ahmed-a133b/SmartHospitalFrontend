import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Loader } from 'lucide-react';
import { processChatQuery } from '../../../../services/queryService';

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
    setMessages([
      { 
        text: "Hello! I'm your Smart Hospital Assistant. You can ask me about patient status, room occupancy, or alerts.", 
        isUser: false, 
        timestamp: new Date() 
      }
    ]);
    
    return () => {
      if (recognition.current) {
        recognition.current.stop();
      }
    };
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    } catch (error) {
      console.error('Error processing query:', error);
      setMessages(prev => [...prev, {
        text: "I'm sorry, I couldn't process that query. Please try again.",
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
                <div className="text-sm text-gray-900">{message.text}</div>
                
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
    </div>
  );
};

export default SmartQueryChat;