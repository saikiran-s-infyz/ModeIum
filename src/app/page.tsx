'use client'

import { useState, useRef, useEffect } from 'react';
import { Play, Square, Paperclip, Loader } from 'lucide-react';
import Image from 'next/image';

interface Message {
  content: string;
  sender: 'user' | 'bot';
  type?: 'text' | 'image';
  imageData?: {
    data: string;
    type: string;
  };
}


const checkForFounderQuestion = (message: string): string | null => {
  const founderPatterns = [
    'who is your founder',
    'who created you',
    'who made you',
    'who developed you',
    'who owns you',
    'who built you',
    'your founder',
    'your creator',
    'your developer'
  ];

  const isFounderQuestion = founderPatterns.some(pattern => 
    message.toLowerCase().includes(pattern)
  );

  return isFounderQuestion ? "Software Engineer from Infyz Solutions" : null;
};

const WelcomeMessage = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="flex justify-center w-full mt-8">
      <div 
        className={`max-w-[70%] p-6 rounded-2xl bg-black text-white font-sans text-center transition-all duration-1000 ease-in-out transform
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <h2 className="text-xl font-bold mb-3">Welcome to ModeIum! 👋</h2>
        <p className="text-gray-300">
          I&apos;m your AI assistant, ready to help you with any questions or tasks.
          To get started, please enter your API key above.
        </p>
      </div>
    </div>
  );
};

const Message = ({ content, sender, type = 'text', imageData }: Message) => (
  <div
    className={`max-w-[70%] p-4 rounded-2xl text-sm leading-relaxed break-words
      ${sender === 'user' 
        ? 'self-end bg-black text-white text-right font-sans capitalize'
        : 'self-start bg-black text-white text-left font-sans capitalize'}`}
  >
    {type === 'image' && imageData ? (
      <Image  
        src={`data:${imageData.type};base64,${imageData.data}`}
        alt="Uploaded content"
        className="max-w-full rounded-lg mb-2"
        width={500}
        height={500}
      />

    ) : (
      content
    )}
  </div>
);

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApiKeySubmitted, setIsApiKeySubmitted] = useState(false);
  const [isSubmittingKey, setIsSubmittingKey] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleApiKeySubmit = async () => {
    if (!apiKey.trim()) {
      alert('Please enter an API key');
      return;
    }

    setIsSubmittingKey(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsApiKeySubmitted(true);
      alert('API key submitted successfully!');
    } catch (error) {
      console.error('API key validation error:', error);
      alert('Error validating API key');
        } finally {
      setIsSubmittingKey(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['text/plain', 'image/png', 'image/jpeg', 'application/pdf'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        alert('Invalid file type. Please upload a .txt, .png, .jpg, or .pdf file.');
        setSelectedFile(null);
        event.target.value = '';
        return;
      }

      if (file.size > maxSize) {
        alert('File is too large. Maximum size is 5MB.');
        setSelectedFile(null);
        event.target.value = '';
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !selectedFile) {
      alert('Please provide a message or a file.');
      return;
    }

    if (!isApiKeySubmitted) {
      alert('Please submit your API key first.');
      return;
    }

    // Check for founder-related questions
    const founderResponse = checkForFounderQuestion(inputMessage);
    if (founderResponse) {
      setMessages(prev => [
        ...prev,
        { content: inputMessage, sender: 'user', type: 'text' },
        { content: founderResponse, sender: 'bot', type: 'text' }
      ]);
      setInputMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsLoading(true);
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const formData = new FormData();
    if (inputMessage.trim()) formData.append('message', inputMessage.trim());
    if (selectedFile) formData.append('file', selectedFile);
    if (apiKey.trim()) formData.append('apiKey', apiKey.trim());

    try {
      const endpoint = selectedFile
        ? '/api/message/file'
        : '/api/only_message';

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();

      if (responseData.botResponse) {
        const newMessages: Message[] = [];

        // Add user's text message if exists
        if (inputMessage.trim()) {
          newMessages.push({ content: inputMessage, sender: 'user', type: 'text' });
        }

        // Add user's image if exists
        if (selectedFile && selectedFile.type.startsWith('image/')) {
          const reader = new FileReader();
          await new Promise((resolve) => {
            reader.onload = () => {
              newMessages.push({
                content: 'Image',
                sender: 'user',
                type: 'image',
                imageData: {
                  data: (reader.result as string).split(',')[1],
                  type: selectedFile.type
                }
              });
              resolve(null);
            };
            reader.readAsDataURL(selectedFile);
          });
        }

        // Add bot's response
        newMessages.push({ content: responseData.botResponse, sender: 'bot', type: 'text' });

        setMessages(prev => [...prev, ...newMessages]);
        setInputMessage('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Request failed:', error);
        alert(`Error: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopMessage = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen min-w-screen bg-gradient-to-t from-[#09203f] via-[#537895] to-[#537895] text-white"> 
      <div className="flex flex-col">
        <nav className="flex justify-between items-center px-24 py-5">
          <h1 className="text-3xl font-bold font-serif hover:text-black cursor-pointer">
            ModeIum
          </h1>
          <div className="flex items-center relative">
            <h4 className="mr-2 cursor-pointer">API Key :</h4>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className={`p-1 mr-1 w-64 rounded bg-transparent border border-white outline-none
                ${isApiKeySubmitted ? 'blur-sm select-none' : ''}`}
              disabled={isApiKeySubmitted}
              placeholder="Enter your API key"
            />
            <button
              onClick={handleApiKeySubmit}
              disabled={isSubmittingKey || isApiKeySubmitted}
              className="bg-white text-black px-3 py-2 rounded-lg hover:shadow-lg transition-all 
                disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmittingKey ? (
                <Loader className="animate-spin h-5 w-5" />
              ) : (
                'Go'
              )}
            </button>
          </div>
        </nav>
        
        <div className="flex flex-col justify-end items-center h-[calc(100vh-150px)] w-[95vw] mx-auto rounded border border-gray-600 bg-white/10 pb-2.5 overflow-y-auto">
          <div
            ref={messagesContainerRef}
            className="flex-1 flex flex-col gap-2.5 p-2.5 overflow-y-auto overflow-x-hidden w-full"
          >
            {messages.length === 0 ? (
              <WelcomeMessage />
            ) : (
              messages.map((message, index) => (
                <Message 
                  key={index} 
                  content={message.content} 
                  sender={message.sender}
                  type={message.type}
                  imageData={message.imageData}
                />
              ))
            )}
          </div>

          <div className="h-24 w-[700px] rounded-3xl flex flex-col p-2.5 shadow-lg">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Modeium anything..."
              className="h-full w-full rounded-3xl mb-1 bg-transparent outline-none px-1 text-white placeholder-white"
              disabled={!isApiKeySubmitted}
            />
            <div className="h-full w-full rounded-3xl flex justify-between items-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".txt,.png,.jpg,.pdf"
                className="hidden"
                disabled={!isApiKeySubmitted}
              />
              <Paperclip
                className={`mx-2.5 text-xl cursor-pointer ${!isApiKeySubmitted ? 'opacity-50' : ''} text-black`}
                onClick={() => isApiKeySubmitted && fileInputRef.current?.click()}
              />
              <span className="text-sm text-white-600">
                {selectedFile && `Selected file: ${selectedFile.name}`}
              </span>
              {!isLoading ? (
                <Play
                  className={`mx-2.5 text-xl cursor-pointer ${!isApiKeySubmitted ? 'opacity-50' : ''} text-black`}
                  onClick={handleSendMessage}
                />
              ) : (
                <div className="flex items-center">
                  <Loader className="animate-spin h-5 w-5 mr-2 text-black" />
                  <Square
                    className="mx-2.5 text-xl cursor-pointer text-black"
                    onClick={handleStopMessage}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-white text-sm font-serif flex items-center gap-2">
            <span>❤️</span>
            <span>Love from Software Engineer to Software Engineer</span>
            <span>❤️</span>
          </div>
        </div>
      </div>
    </div>
  );
}