'use client';

import { useState, useEffect, FormEvent, useRef, useCallback, useMemo } from 'react';
import { readStreamableValue } from 'ai/rsc';
import { chat } from './actions';
import ReactMarkdown from 'react-markdown';
import AssistantFiles from './components/AssistantFiles';
import { File, Reference, Message } from './types';
import { v4 as uuidv4 } from 'uuid'; 
import ConversationStarters from './components/ConversationStarters';

import { CopyContentButton } from "./components/useCopytoClipboard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faVolumeHigh, faStopCircle, faSpinner } from "@fortawesome/free-solid-svg-icons";
import ReadAloudButton from "./components/ReadAloud"
interface HomeProps {
  initialShowAssistantFiles: boolean;
  showCitations: boolean;
}

export default function Home({ initialShowAssistantFiles, showCitations }: HomeProps) {
  const [loading, setLoading] = useState(true);
  const [assistantExists, setAssistantExists] = useState(false);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const [assistantName, setAssistantName] = useState('');
  const [referencedFiles, setReferencedFiles] = useState<Reference[]>([]);
  const [showAssistantFiles, setShowAssistantFiles] = useState(initialShowAssistantFiles);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check for dark mode preference
    if (typeof window !== 'undefined') {
      const isDarkMode = localStorage.getItem('darkMode') === 'true';
      setDarkMode(isDarkMode);
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', (!darkMode).toString());
      document.documentElement.classList.toggle('dark');
    }
  };

  const extractReferences = (content: string): Reference[] => {
    const references: Reference[] = [];
    
    // Extract full file names from the content
    const fileNameRegex = /([^:\n]+\.[a-zA-Z0-9]+)/g;
    const fileMatches = content.match(fileNameRegex);
    
    if (fileMatches) {
      fileMatches.forEach(fileName => {
        references.push({ name: fileName.trim() });
      });
    }

    return references;
  };

  useEffect(() => {
    checkAssistant();
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files');
      const data = await response.json();
      if (data.status === 'success') {
        setFiles(data.files);
      } else {
        console.error('Error fetching files:', data.message);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const checkAssistant = async () => {
    try {
      const response = await fetch('/api/assistants')
      const data = await response.json()
      
      setLoading(false)
      setAssistantExists(data.exists)
      setAssistantName(data.assistant_name)
      if (!data.exists) {
        setError('Please create an Assistant')
      }
    } catch (error) {
      setLoading(false)
      setError('Error connecting to the Assistant')
      
    }
  }
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const handleSuggestionSelect = (suggestedQuestion: string) => {
    setInput(suggestedQuestion);
    setTimeout(() => {
      if (buttonRef.current) {
        buttonRef.current.click(); // Trigger form submission
      }
    }, 0);
  };

  const suggestNextQuestions = async (messages: Message[]): Promise<string[]> => {
    try {
      const response = await fetch('/api/suggest-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }
  
      const data = await response.json();
      return data.questions;
    } catch (error) {
      console.error('Error suggesting next questions:', error);
      return [];
    }
  };
  
  const handleChat = async () => {
    if (!input.trim()) return;
  
    const newUserMessage: Message = {
      id: uuidv4(), // Generate a unique ID
      role: 'user',
      content: input,
      timestamp: new Date().toISOString() 
    };
  
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    setInput('');
    setIsStreaming(true);
  
    try {
      const { object } = await chat([newUserMessage]);
      let accumulatedContent = '';
      const newAssistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        references: []
      };
      
      setMessages(prevMessages => [...prevMessages, newAssistantMessage]);
  
      // Process the response stream from the Assistant that is created in the ./actions.ts Server action
      for await (const chunk of readStreamableValue(object)) {
        try {
          const data = JSON.parse(chunk);
          const content = data.choices[0]?.delta?.content;
          
          if (content) {
            accumulatedContent += content;
          }
          
          setMessages(prevMessages => {
            const updatedMessages = [...prevMessages];
            const lastMessage = updatedMessages[updatedMessages.length - 1];
            lastMessage.content = accumulatedContent;
            return updatedMessages;
          });
  
        } catch (error) {
          console.error('Error parsing chunk:', error);
        }
      }
  
      // Extract references after the full message is received
      const extractedReferences = extractReferences(accumulatedContent);
      setReferencedFiles(extractedReferences);
  
      // Suggest next questions based on the conversation history
      const suggested = await suggestNextQuestions([...messages, newUserMessage]);
      setSuggestedQuestions(suggested);
  
    } catch (error) {
      console.error('Error in chat:', error);
      setError('An error occurred while chatting.');
    } finally {
      setIsStreaming(false);
    }
  };
  

  const starters = [
    "ભાવતીર્થ શુ છે?",
    "ધર્મતીર્થ શુ છે?",
    "ધર્મ શુ છે?",
    "આત્માના ગુણ શુ છે?",
    "ફળની અપેક્ષાએ ધર્મ કરાય?",
    "કારણતાનો સિદ્ધાંત શુ છે?",
    "ધર્મના ફળ શું?",
    "મોક્ષ શું છે?",
    "અહિંસા નું મહત્વ શું છે?",
    "આત્માની વ્યાખ્યા શું છે?",
    "સંયમ નો અર્થ શું છે?",
    "સત્ય શું છે?",
    "બ્રહ્મચર્ય નું મહત્વ શું છે?",
    "અપરિગ્રહ નો અર્થ શું છે?",
    "અનુવ્રત અને મહાવ્રત માં શું તફાવત છે?",
    "અનિશ્ચિતતા નો સિદ્ધાંત શું છે?",
    "સંમ્યક દૃષ્ટિ શું છે?",
    "સપ્તભંગી શું છે?",
    "નયાવાદ શું છે?",
    "અણુ નો અર્થ શું છે?",
    "પંચ પરમેશ્ઠી શું છે?",
    "સાધુ નો અર્થ શું છે?",
    "સાધુ નું જીવન કેવું હોવું જોઈએ?",
    "અચોર્ય નું મહત્વ શું છે?",
    "મિથ્યાત્વ શું છે?",
    "કષાય શું છે?",
    "અનંતાનુબંધિ કષાય શું છે?",
    "ક્ષણિકતા નો સિદ્ધાંત શું છે?",
    "નિર્ગ્રંથ નો અર્થ શું છે?",
    "દેવ, શાસ્ત્ર, અને ગુરુ નો મહિમા શું છે?",
    "દ્રવ્ય અને ભાવ નો તફાવત શું છે?",
    "કર્મનો સિદ્ધાંત શું છે?",
    "જિનરાજ નો અર્થ શું છે?",
    "બહુશ્રુત નો અર્થ શું છે?",
    "સમ્યકત્વ શું છે?",
    "મોક્ષમાર્ગ કયો છે?",
    "અનુકંપા નો અર્થ શું છે?",
    "બંધીજીવ અને મુક્તજીવ માં શું તફાવત છે?",
    "પ્રત્યક્ષ અને પરોક્ષ શું છે?",
    "જ્ઞાનના પ્રકારો કેટલાં છે?",
    "કેવલજ્ઞાન શું છે?",
    "શ્રાવક અને શ્રમણ માં શું તફાવત છે?",
    "ઉપાધ્યાય નો અર્થ શું છે?",
    "આર્યિકા નું જીવન કેવું હોવું જોઈએ?",
    "સમવસરણ શું છે?",
    "આત્મસહાય શું છે?",
    "અનુવ્રત ના લાભ શું છે?",
    "અપરિગ્રહ નો વ્રત કેવી રીતે પાળવો?",
    "સ્વધર્મ નું પાલન કેવી રીતે કરવું?",
    "ચતુર્વિધ સંઘ શું છે?",
    "શિક્ષાવ્રત શું છે?",
    "પંચપ્રાણ નું મહત્વ શું છે?",
    "અનુકંપા અને કરુણા માં શું તફાવત છે?",
    "વિતરાગી નો અર્થ શું છે?",
    "સમ્યક ચારિત્ર શું છે?",
    "સંયમ ક્યો છે?",
    "પરિષહો શું છે?",
    "મંદકષાય નું મહત્વ શું છે?",
    "પ્રાણાતિપાત નો અર્થ શું છે?",
    "પ્રયોગ અને નિયમ નો સંબંધ શું છે?",
    "યોગ ના પ્રકારો કેટલાં છે?",
    "અહિંસા ના ઉપકાર શું છે?",
    "જૈન ત્રિરત્નો શું છે?",
    "અદ્વંદ્વ નું મહત્વ શું છે?",
    "જૈન તીર્થકરો ના ઉપદેશ શું છે?",
    "અવિરતિ શું છે?",
    "મૂળત્વ શું છે?",
    "પંચદોષ શું છે?",
    "સમ્યક જ્ઞાન શું છે?",
    "આત્માનુભવ શું છે?",
    "વિજ્ઞાન અને જ્ઞાન નો તફાવત શું છે?",
    "નિયમસાર નું મહત્વ શું છે?",
    "અપરિગ્રહ ના ઉપકાર શું છે?",
    "અવ્યાભિચાર શું છે?",
    "જન્મમરણ નો ચક્ર શું છે?",
    "જીવ અને અજીવ માં શું તફાવત છે?",
    "અદ્વંદ્વી આત્મા શું છે?",
    "સંભવ અને નિર્વાણ નું મહત્વ શું છે?",
    "ધર્મસંઘ નો અર્થ શું છે?",
    "જૈન તીર્થો નું મહત્વ શું છે?",
    "વિતારાગધર્મ શું છે?",
    "અષ્ટમૂલગણો શું છે?",
    "સામાયિક શું છે?",
    "પ્રતિષ્ઠા નો અર્થ શું છે?",
    "આચાર્ય નો મહિમા શું છે?",
    "સર્વાવાસ્તવિકતા નો સિદ્ધાંત શું છે?",
    "યોગ ના ઉપકાર શું છે?",
    "અણુકાય નો અર્થ શું છે?",
    "જૈન ઐતિહાસિકતા શું છે?",
    "આત્માન્તર આયામ શું છે?",
    "ધર્મનો નિર્વાહ કેવી રીતે કરવો?",
    "પ્રમાદ નું મહત્વ શું છે?",
    "અપરિગ્રહ ના અર્થચિંતન શું છે?",
    "સંયમ અને ત્યાગ નો સંબંધ શું છે?",
    "મિતાહાર નો અર્થ શું છે?",
    "ધર્મચક્ર નું મહત્વ શું છે?",
    "અવિરતિ ના ઉપકાર શું છે?",
    "પરિષહો ના ઉપાય શું છે?",
    "જૈન શાસ્ત્રો નું મહત્વ શું છે?",
    "મુક્તિ અને બાંધી નો તફાવત શું છે?",
    "સર્વન્યાય નો સિદ્ધાંત શું છે?",
    "અનુકંપા અને મૈત્રી નો તફાવત શું છે?",
    "અવિરતિ ના મોખરાં શું છે?",
    "અસ્તિત્વ નો અર્થ શું છે?",
  ];
  
  // Randomly select 3 starters
  const selectedStarters = useMemo(() => starters.sort(() => 0.5 - Math.random()).slice(0, 3), []);

  const [startersVisible, setStartersVisible] = useState(true);

  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleStarterSelect = (starter: string) => {
    setInput(starter);
    setStartersVisible(false); // Hide the starters after selection
    // Ensure that the button is clicked to submit the form
  setTimeout(() => {
    if (buttonRef.current) {
      buttonRef.current.click();
    }
  }, 0);
};

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 sm:p-8 bg-gradient dark:bg-gray-900">
      <button
        onClick={toggleDarkMode}
        className="absolute top-4 right-4 p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
        aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        {darkMode ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>
      
      {loading ? (
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-900 mb-4"></div>
          <p className="text-gray-500">Connecting to JyotChat...</p>
        </div>
      ) : assistantExists ? (
        <div className="w-full max-w-6xl xl:max-w-7xl">          
          <div className="flex flex-col items-center">
          <a href="https://jyot.in" target="_blank" rel="noopener noreferrer">
            <img
              src="/logo.png"
              alt="JyotChat Assistant"
              className="w-12 h-12 rounded-full object-cover mb-2"
            />
          </a>
          <h1 className="text-2xl font-bold mb-4 text-indigo-900 dark:text-indigo-100 text-center">
            {assistantName.charAt(0).toUpperCase() + assistantName.slice(1)}
          </h1>
        </div>

          <div className="flex flex-col gap-4">
            <div className="w-full">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg mb-4 h-[calc(100vh-250px)] overflow-y-auto">
              <div className="flex justify-center mt-auto">
              {startersVisible && messages.length === 0 && (
                <ConversationStarters starters={selectedStarters} onSelect={handleStarterSelect} />
              )}
              </div>
                {messages.map((message, index) => (
                  <div key={index} className={`mb-2 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`${message.role === 'user' ? 'ml-2' : 'mr-2'}`}>
                        {message.role === 'user' ? (
                          <span className="text-2xl">👤</span>
                        ) : (
                          <a href="https://jyot.in" target="_blank" rel="noopener noreferrer">
                            <img
                              src="/logo.png"
                              alt="JyotChat Assistant"
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          </a>
                        )}
                      </div>
                      <span className={`inline-block p-2 rounded-lg ${
                        message.role === 'user' ? 'bg-gray-700 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      } max-w-[80%] break-words`}>
                        <ReactMarkdown
                          components={{
                            a: ({ node, ...props }) => (
                              <a {...props} className="text-blue-600 dark:text-blue-400 hover:underline">
                                🔗 {props.children}
                              </a>
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                        {message.role !== 'user' && (
                        <div className="flex items-center gap-2 mt-1">
                          <CopyContentButton content={message.content} />
                          <ReadAloudButton content={message.content} />
                        </div>
                      )}
                        {message.references && showCitations && (
                          <div className="mt-2">
                            <ul>
                              {message.references.map((ref, i) => (
                                <li key={i}>
                                  <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                                    {ref.name}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleChat(); }} className="flex mb-4">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-grow p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Type your message"
                  disabled={isStreaming}
                />
                <button
                  type="submit"
                  ref={buttonRef} // Attach the ref to the submit button
                  className="bg-gray-500 text-white p-2 rounded-r-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isStreaming}
                >
                  {isStreaming ? 'Streaming...' : 'Send'}
                </button>
              </form>

              {suggestedQuestions.length > 0 && (
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mt-4">
                  <h3 className="font-bold mb-2">Suggested Next Questions:</h3>
                  <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionSelect(question)}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {index + 1}. {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}


              {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md shadow-md">
                  <div className="flex items-center">
                    <svg className="h-6 w-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="font-semibold">Error</p>
                  </div>
                  <p className="mt-2">{error}</p>
                </div>
              )}
            </div>
            {showAssistantFiles && (
              <div className="w-full">
                <AssistantFiles files={files} referencedFiles={referencedFiles} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-md max-w-2xl">
          <div className="flex items-center">
            <svg className="h-6 w-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="font-semibold">Error</p>
          </div>
          <p className="mt-2">{error}</p>
          <div className="mt-4 text-sm">
            <p className="font-semibold">To resolve this issue:</p>
            <ol className="list-decimal list-inside mt-2 space-y-2">
              <li>Create a Pinecone Assistant at <a href="https://app.pinecone.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://app.pinecone.io</a></li>
              <li>Export the environment variable <code className="bg-red-200 px-1 rounded">PINECONE_ASSISTANT_NAME</code> with the value of your assistant&apos;s name</li>
              <li>Restart your application</li>
            </ol>
          </div>
        </div>
      )}

    </main>
  );
}