'use client'

import { useState, useRef, useEffect } from 'react';
import { Play, Square, Paperclip, Loader, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signOutUser } from '@/lib/firebase';
import { LogOut } from 'lucide-react';

interface Message {
  content: string;
  sender: 'user' | 'bot';
  type?: 'text' | 'image';
  imageData?: {
    data: string;
    type: string;
  };
}

interface AIModel {
  name: string;
  requiresAPIKey: boolean;
  icon?: string; // Optional icon or logo path
}

const availableModels: AIModel[] = [
  { name: 'GPT-4', requiresAPIKey: true },
  { name: 'Claude', requiresAPIKey: true },
  { name: 'Gemini', requiresAPIKey: true },
  { name: 'DeepSeek R1', requiresAPIKey: false },
  { name: 'Llama 90b Vision Preview', requiresAPIKey: false },
  { name: 'Gamma', requiresAPIKey: false }
];



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

  return isFounderQuestion ? "Software Engineer" : null;
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
  const router = useRouter();
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

  const [selectedModel, setSelectedModel] = useState<AIModel>(availableModels[0]);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  const handleModelSelect = (model: AIModel) => {
    setSelectedModel(model);
    setIsModelDropdownOpen(false);
  
    // Remove the API key prompt for free models
    if (model.requiresAPIKey && !isApiKeySubmitted) {
      alert(`Please submit an API key for ${model.name}`);
      return;
    }
  };



  const handleSignOut = async () => {
    try {
      await signOutUser();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Error signing out. Please try again.');
    }
  };

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
  
    if (selectedModel.requiresAPIKey && !isApiKeySubmitted) {
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
      // First, immediately add user's message to chat
      if (inputMessage.trim()) {
        setMessages(prev => [...prev, { content: inputMessage, sender: 'user', type: 'text' }]);
      }
  
      // Add user's image if exists
      if (selectedFile && selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onload = () => {
            setMessages(prev => [...prev, {
              content: 'Image',
              sender: 'user',
              type: 'image',
              imageData: {
                data: (reader.result as string).split(',')[1],
                type: selectedFile.type
              }
            }]);
            resolve(null);
          };
          reader.readAsDataURL(selectedFile);
        });
      }
  
      // Clear input and file
      setInputMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  
      // Generate endpoint based on selected model and file status
      const modelSlug = selectedModel.name
        .toLowerCase()
        .replace(/\s+\(.*\)/, '')
        .replace(/\s+/g, '');
  
      const endpoint = selectedFile 
        ? `/api/message/${modelSlug}/file` 
        : `/api/message/${modelSlug}/only_message`;
  
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
        // Only add bot's response
        setMessages(prev => [...prev, { 
          content: responseData.botResponse, 
          sender: 'bot', 
          type: 'text' 
        }]);
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

  const backgroundOptions = [
    { name: 'Default Blue', className: 'bg-gradient-to-t from-[#09203f] via-[#537895] to-[#537895]', theme: 'light' },
    { name: 'Light Blue', className: 'bg-gradient-to-t from-[#accbee] to-[#e7f0fd]', theme: 'dark' },
    { name: 'Dark Mode', className: 'bg-gradient-to-r from-[#434343] to-black', theme: 'light' },
    { name: 'Sky Blue', className: 'bg-gradient-to-br from-[#7085B6] via-[#87A7D9] to-[#DEF3F8]', theme: 'dark' },
    { name: 'Light', className: 'bg-gradient-to-t from-[#dfe9f3] to-white', theme: 'dark' },
    { name: 'Dark Blend', className: 'bg-[linear-gradient(to_bottom,#323232_0%,#3F3F3F_40%,#1C1C1C_150%),linear-gradient(to_top,rgba(255,255,255,0.40)_0%,rgba(0,0,0,0.25)_200%)]', theme: 'light' },
  ];

  const [selectedBackground, setSelectedBackground] = useState(backgroundOptions[0].className);

  const [currentTheme, setCurrentTheme] = useState(backgroundOptions[0].theme);

  const handleThemeChange = (bg: typeof backgroundOptions[0]) => {
    setSelectedBackground(bg.className);
    setCurrentTheme(bg.theme);
  };

  return (
    <div className={`min-h-screen min-w-screen ${selectedBackground} text-white transition-all duration-500`}> 
      <div className="flex flex-col">
      <nav className="flex justify-between items-center px-24 py-5">
        <h1 className={`text-3xl font-bold font-serif cursor-pointer hover:opacity-80 ${
          currentTheme === 'light' ? 'text-white' : 'text-black'
        }`}>
          ModeIum
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center relative">
          <h4 className={`mr-2 cursor-pointer ${
            currentTheme === 'light' ? 'text-white' : 'text-black'
          }`}>
            API Key :
          </h4>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className={`p-1 mr-1 w-70 rounded bg-transparent outline-none
              ${isApiKeySubmitted ? 'blur-sm select-none' : ''} 
              ${currentTheme === 'light' 
                ? 'border-white text-white placeholder-white border-2' 
                : 'border-black text-black placeholder-black border-2'
              }`}
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
          
          <button
            onClick={handleSignOut}
            className={`flex items-center gap-2 ${
              currentTheme === 'light' 
                ? 'bg-white/10 text-white hover:bg-white/20' 
                : 'bg-black/10 text-black hover:bg-black/20'
            } px-4 py-2 rounded-lg transition-all`}
          >
            <LogOut className={`w-4 h-4 ${
              currentTheme === 'light' ? 'text-white' : 'text-black'
            }`} />
            Sign Out
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
            className={`h-full w-full rounded-3xl mb-1 bg-transparent outline-none px-1 
              ${currentTheme === 'light' 
                ? 'text-white placeholder-white border-white' 
                : 'text-black placeholder-black border-black'
              }`}
            disabled={selectedModel.requiresAPIKey && !isApiKeySubmitted}
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
                className={`mx-2.5 text-xl cursor-pointer ${
                  !isApiKeySubmitted ? 'opacity-50' : ''
                } ${currentTheme === 'light' ? 'text-white' : 'text-black'}`}
                onClick={() => isApiKeySubmitted && fileInputRef.current?.click()}
              />
              <span className="text-sm text-white-600">
                {selectedFile && `Selected file: ${selectedFile.name}`}
              </span>
              {!isLoading ? (
                <Play
                className={`mx-2.5 text-xl cursor-pointer ${
                  !isApiKeySubmitted ? 'opacity-50' : ''
                } ${currentTheme === 'light' ? 'text-white' : 'text-black'}`}
                onClick={handleSendMessage}
              />
              ) : (
                <div className="flex items-center">
                  <Loader className={`animate-spin h-5 w-5 mr-2 ${
                    currentTheme === 'light' ? 'text-white' : 'text-black'
                  }`} />
                  <Square
                    className={`mx-2.5 text-xl cursor-pointer ${
                      currentTheme === 'light' ? 'text-white' : 'text-black'
                    }`}
                    onClick={handleStopMessage}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="fixed bottom-0 right-12 flex flex-col items-end">
            <div className="bg-white/15 backdrop-blur-sm p-1 rounded-lg mb-1 shadow-lg">
            <p className={`text-sm mb-1 ${
              currentTheme === 'light' ? 'text-white' : 'text-black'
            }`}>
              Choose Theme:
            </p>
              <div className="flex gap-3">
              {backgroundOptions.map((bg, index) => (
                <button
                  key={index}
                  onClick={() => handleThemeChange(bg)}
                  className={`w-8 h-8 rounded-full transition-all duration-200 ${bg.className} ${
                    selectedBackground === bg.className 
                      ? 'ring-2 ring-white scale-110' 
                      : 'hover:scale-105'
                  }`}
                  title={bg.name}
                />
              ))}
              </div>
            </div>
          </div>
          <div className={`fixed bottom-2 left-12 flex flex-col items-start z-50 ${
            currentTheme === 'light' ? 'text-black' : 'text-white'
          }`}>
            <div className="relative">
            <button 
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className={`flex items-center justify-between w-48 px-3 py-2 rounded-lg transition-all 
                ${currentTheme === 'light' 
                  ? 'bg-black/10 text-black hover:bg-black/20' 
                  : 'bg-white/10 text-white hover:bg-white/20'
                }`}
            >
              <span>{selectedModel.name}</span>
              <ChevronDown className={`ml-2 ${
                currentTheme === 'light' ? 'text-black' : 'text-white'
              }`} />
            </button>
              
              {isModelDropdownOpen && (
                <div className={`absolute bottom-full mb-2 w-48 rounded-lg shadow-lg
                  ${currentTheme === 'light' 
                    ? 'bg-white text-black' 
                    : 'bg-black text-white'
                  }`}
                >
                  {availableModels.map((model) => (
                    <div 
                      key={model.name}
                      onClick={() => handleModelSelect(model)}
                      className={`px-3 py-2 cursor-pointer hover:opacity-80 
                        ${selectedModel.name === model.name 
                          ? (currentTheme === 'light' 
                              ? 'bg-black/10' 
                              : 'bg-white/10') 
                          : ''
                        }
                        ${currentTheme === 'light' 
                          ? 'text-black hover:bg-black/10' 
                          : 'text-white hover:bg-white/10'
                        }`}
                    >
                      {model.name}
                      {model.requiresAPIKey ? 
                        <span className={`text-xs ml-2 
                          ${currentTheme === 'light' 
                            ? 'text-black/60' 
                            : 'text-white/60'
                          }`}
                        >
                          (API Key)
                        </span> : 
                        <span className={`text-xs ml-2 
                          ${currentTheme === 'light' 
                            ? 'text-black/60' 
                            : 'text-white/60'
                          }`}
                        >
                          (Free)
                        </span>
                      }
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}