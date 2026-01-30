'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion'; 
import { useRouter } from 'next/navigation';
import axios from 'axios';
import CollapsibleComponent from '../components/CollapsibleComponent';
import UserProfile from '../components/UserProfile';
import DBIntegrationModal from '../components/DBIntegrationModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import recordingAnimation from '../../public/assets/animations/recording.json';

import { faMicrophone, faChartLine, faPlus, faChevronLeft, faChevronRight, faDatabase,faSpinner, faUser, faRobot, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { Inter, Sora } from 'next/font/google';
import SQLResultCard from '../components/SQLResultCard';


const Player = dynamic(() => import('@lottiefiles/react-lottie-player').then(mod => mod.Player), {
  ssr: false,
});

interface Message {
  id: number;
  text: string;
  createdAt: string;
  isQueryResult?: boolean;
  queryResults?: any[];
  _id?: string;
  sender: string;
  isError?: boolean;
  error?: string;
}

interface Chat {
  _id: number;
  title: string;
  messages: Message[];
  isTitleLoading?: boolean;
}
interface CategorizedChats {
  today: Chat[];
  yesterday: Chat[];
  previous7Days: Chat[];
  older: Chat[];
}

interface MessageResponse {
  data: {
    chat: Chat;
  };
}

const categorizeChats = (chats: Chat[] | null | undefined): CategorizedChats => {
  if (!Array.isArray(chats)) {
    console.error("categorizeChats received invalid data:", chats);
    return { today: [], yesterday: [], previous7Days: [], older: [] };
  }

  const today: Chat[] = [];
  const yesterday: Chat[] = [];
  const previous7Days: Chat[] = [];
  const older: Chat[] = [];

  chats.forEach((chat) => {
    if (chat.messages.length === 0) return; 
    const lastMessageDate = new Date(chat.messages[chat.messages.length - 1].createdAt);

    if (isToday(lastMessageDate)) {
      today.push(chat);
    } else if (isYesterday(lastMessageDate)) {
      yesterday.push(chat);
    } else if (isThisWeek(lastMessageDate)) {
      previous7Days.push(chat);
    } else {
      older.push(chat);
    }
  });

  const sortByDateDesc = (a: Chat, b: Chat) => {
    const dateA = new Date(a.messages[a.messages.length - 1].createdAt).getTime();
    const dateB = new Date(b.messages[b.messages.length - 1].createdAt).getTime();
    return dateB - dateA;
  };

  return {
    today: today.sort(sortByDateDesc),
    yesterday: yesterday.sort(sortByDateDesc),
    previous7Days: previous7Days.sort(sortByDateDesc),
    older: older.sort(sortByDateDesc),
  };
};

// Initialize fonts
const inter = Inter({ 
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter'
});

const sora = Sora({ 
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sora'
});

export default function ChatsPage() {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [categorizedChats, setCategorizedChats] = useState<CategorizedChats>({
    today: [],
    yesterday: [],
    previous7Days: [],
    older: [],
  });
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [loadingTitle, setLoadingTitle] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showDBModal, setShowDBModal] = useState(false); 
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [connectedDbId, setConnectedDbId] = useState<string | null>(null);
  const [isSQLMode, setIsSQLMode] = useState(false);

  

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchChats = async () => {
      try {
        const response = await axios.get('http://localhost:3001/chat', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setChats(response.data);
        setCategorizedChats(categorizeChats(response.data));
      } catch (error) {
        console.error('Error fetching chats:', error);
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          router.push('/login');
        }
      }
    };

    fetchChats();
  }, [router]);

  useEffect(() => {
    const fetchActiveDatabase = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3001/database/active', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.activeDatabase) {
          setConnectedDbId(response.data.activeDatabase._id);
        } else {
          setConnectedDbId(null);
        }
      } catch (error) {
        console.error('No active database found');
        setConnectedDbId(null);
      }
    };
    fetchActiveDatabase();
  }, []);

  const handleDatabaseConnectionChange = (dbId: string | null) => {
    setConnectedDbId(dbId);
  };

  const recordingOptions = {
    loop: true,
    autoplay: true,
    animationData: recordingAnimation,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice',
    },
  };


  useEffect(() => {
    const initializeRecorder = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            setAudioBlob(event.data);
          }
        };
        setMediaRecorder(recorder);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Please allow microphone access and reload the page.');
      }
    };
    initializeRecorder();
    return () => {
      mediaRecorder?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const toggleRecording = async () => {
    if (isRecording) {
      console.log("Stopping recording...");
      if (mediaRecorder) {
      
        mediaRecorder.stop();
        setIsRecording(false);
  
       
        if (audioStream) {
          audioStream.getTracks().forEach((track) => track.stop());
          setAudioStream(null);
        }
  
        
        const finalizedBlob = await new Promise<Blob | null>((resolve) => {
          const chunks: Blob[] = [];
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunks.push(event.data);
            }
          };
  
          mediaRecorder.onstop = () => {
            if (chunks.length > 0) {
              const finalBlob = new Blob(chunks, { type: "audio/webm" });
              console.log("Recording finalized. Blob size:", finalBlob.size);
              resolve(finalBlob);
            } else {
              console.error("No audio data available.");
              resolve(null);
            }
          };
        });
  
       
        if (finalizedBlob) {
          setAudioBlob(finalizedBlob);
          console.log("Audio blob ready for transcription:", finalizedBlob);
  

          try {
            console.log("Uploading audio blob for transcription...");
            setIsTranscribing(true);
  
            const formData = new FormData();
            // Convert the blob to a file with a proper name and type
            const audioFile = new File([finalizedBlob], "audio.webm", { type: "audio/webm" });
            formData.append("file", audioFile);  // Changed from "voiceFile" to "file" to match Flask API
  
            console.log("Sending request to server...");
            const response = await axios.post("http://localhost:5001/transcribe", formData, {
              headers: {
                "Content-Type": "multipart/form-data",
                "Accept": "application/json",
              },
              onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total!);
                console.log(`Upload progress: ${percentCompleted}%`);
              },
              timeout: 30000, 
            });

            console.log("Server response:", response.data);
  
            if (response.data && response.data.transcription) {
              let meaningfulText = response.data.transcription.replace(/\[.*?\]\s*/g, "").trim();
              if (isSQLMode) {
                meaningfulText = `Generate SQL: ${meaningfulText}`;
              }
              setInput(meaningfulText);
            } else {
              console.error("Invalid response format:", response.data);
              alert("Transcription failed: Invalid response format");
            }
          } catch (error) {
            console.error("Error uploading audio:", error);
            if (axios.isAxiosError(error)) {
              if (error.code === 'ERR_NETWORK') {
                console.error("Network error - Make sure the Whisper API server is running on port 5001");
                alert("Could not connect to the transcription service. Please make sure the service is running.");
              } else {
                console.error("Axios error details:", {
                  status: error.response?.status,
                  data: error.response?.data,
                  headers: error.response?.headers
                });
                alert(`Failed to upload audio: ${error.response?.data?.message || error.message}`);
              }
            } else {
              alert("Failed to upload audio. Please try again.");
            }
          } finally {
            setIsTranscribing(false);
          }
        } else {
          alert("No audio recorded. Please try again.");
        }
      }
    } else {
      try {
        console.log("Starting recording...");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioStream(stream);
  
        const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
        const recorder = new MediaRecorder(stream, { mimeType });
        setMediaRecorder(recorder);
  
        recorder.start();
        setIsRecording(true);
        console.log("Recording started...");
      } catch (error) {
        console.error("Error accessing microphone:", error);
        alert("Please allow microphone access and try again.");
      }
    }
  };
  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto'; 
    textarea.style.height = `${textarea.scrollHeight}px`; 
  };
  
  
  const selectChat = (chatId: number) => {
    console.log("Selected chat ID:", chatId);
    setActiveChatId(chatId); 
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() === '') return;

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    let chatId = activeChatId;
    setIsSending(true);

    try {
      // Create new chat if needed
      if (!chatId) {
        const createChatResponse = await axios.post(
          'http://localhost:3001/chat/create',
          { title: 'New Chat', messages: [] },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const newChat = { 
          ...createChatResponse.data.chat, 
          title: 'New Chat',
          isTitleLoading: false
        }; 

        setChats((prevChats) => {
          const updatedChats = Array.isArray(prevChats) ? [...prevChats, newChat] : [newChat];
          setCategorizedChats(categorizeChats(updatedChats));
          return updatedChats;
        });

        setActiveChatId(newChat._id);
        chatId = newChat._id;
      }

      // Send message to backend - it will handle SQL generation if needed
      const messageResponse = await axios.post(
        'http://localhost:3001/chat/message',
        { 
          chatId, 
          text: input.trim(),
          sender: "user"
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Get the updated chat
      const chat = messageResponse.data.chat;

      // Check if this is the first user message (trigger title generation)
      const userMessages = chat.messages.filter((msg: Message) => msg.sender === 'user');
      console.log('📊 Message count check:', {
        totalMessages: chat.messages.length,
        userMessages: userMessages.length,
        shouldGenerateTitle: userMessages.length === 1
      });
      
      if (userMessages.length === 1) {
       
        setChats((prevChats) => {
          const updatedChats = prevChats.map((c) =>
            c._id === chatId ? messageResponse.data.chat : c
          );
          setCategorizedChats(categorizeChats(updatedChats));
          return updatedChats;
        });

        // Set loading state for title generation
        setChats((prevChats) => {
          const updatedChats = prevChats.map((c) =>
            c._id === chatId ? { ...c, isTitleLoading: true } : c
          );
          setCategorizedChats(categorizeChats(updatedChats));
          return updatedChats;
        });

        try {
          // Generate title using backend route
          console.log('🎯 Generating title for chat:', chatId);
          const titleResponse = await axios.get(
            `http://localhost:3001/chat/${chatId}/title`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (titleResponse.data && titleResponse.data.title) {
            // Keep loading state visible for a moment
            await new Promise(resolve => setTimeout(resolve, 500));

            // Update the title in the frontend state (title is already saved in backend)
            setChats((prevChats) => {
              const updatedChats = prevChats.map((chat) =>
                chat._id === chatId ? { 
                  ...chat,
                  title: titleResponse.data.title,
                  isTitleLoading: false 
                } : chat
              );
              setCategorizedChats(categorizeChats(updatedChats));
              return updatedChats;
            });
          }
        } catch (error) {
          console.error('❌ Error generating title:', error);
          // Set a default title if generation fails
          setChats((prevChats) => {
            const updatedChats = prevChats.map((chat) =>
              chat._id === chatId ? { 
                ...chat,
                title: `Chat ${new Date().toLocaleTimeString()}`,
                isTitleLoading: false 
              } : chat
            );
            setCategorizedChats(categorizeChats(updatedChats));
            return updatedChats;
          });
        }
      } else {
        // Update chat state for non-first messages
        setChats((prevChats) => {
          const updatedChats = prevChats.map((chat) =>
            chat._id === chatId ? messageResponse.data.chat : chat
          );
          setCategorizedChats(categorizeChats(updatedChats));
          return updatedChats;
        });
      }

      setInput('');
      setIsSending(false);
    } catch (error) {
      console.error('❌ Error in message handling:', error);
    } finally {
      setIsSending(false);
    }
  };
  
  
  const handleCreateNewChat = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
  
    try {
      const response = await axios.post(
        'http://localhost:3001/chat/create',
        { title: 'New Chat', messages: [] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      const newChat = { 
        ...response.data.chat, 
        title: 'New Chat',
        isTitleLoading: false  // Start with false to show the chat immediately
      }; 

      // Update state immediately to show the new chat
      setChats(prevChats => {
        const updatedChats = Array.isArray(prevChats) ? [...prevChats, newChat] : [newChat];
        setCategorizedChats(categorizeChats(updatedChats));
        return updatedChats;
      });
      
      // Set active chat immediately
      setActiveChatId(newChat._id);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };
  
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const activeChat = chats.find((chat) => chat._id === activeChatId);

  return (
    <div className={`flex h-screen ${inter.variable} ${sora.variable} bg-white`}>
      {/* Sidebar */}
      <motion.div
        className={`bg-gray-50 h-full transition-all duration-500 relative ${
          isCollapsed ? 'w-0' : 'w-64'
        }`}
      >
        {!isCollapsed && (
          <div className="flex flex-col h-full px-2">
            {/* Header Section */}
            <div className="flex justify-between items-center p-4">
              <h2 className={`font-bold text-lg text-[#5942E9] font-sora`}>Chats</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCreateNewChat}
                  className="bg-gradient-to-r from-[#5942E9] to-[#42DFE9] text-white p-2 rounded-full hover:opacity-90 transition-all duration-300"
                >
                  <FontAwesomeIcon icon={faPlus} />
                </button>
                <button
                  onClick={() => setShowDBModal(true)}
                  className="bg-gradient-to-r from-[#5942E9] to-[#42DFE9] text-white p-2 rounded-full hover:opacity-90 transition-all duration-300"
                >
                  <FontAwesomeIcon icon={faDatabase} />
                </button>
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"
                >
                  <FontAwesomeIcon icon={faChevronLeft} className="text-black" />
                </button>
              </div>
            </div>

            {/* Scrollable Chat List */}
            <div className="flex-grow overflow-y-auto">
              {Object.entries(categorizedChats).map(([category, chats]) => (
                <div key={category} className="mb-4">
                  <h3 className={`text-[#5942E9] font-bold text-sm px-4 py-2 font-sora`}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </h3>
                  <div>
                    {chats.length === 0 ? (
                      <p className="text-center text-gray-500 font-inter text-sm px-4">No chats available</p>
                    ) : (
                      chats.map((chat: Chat) => (
                        <button
                          key={chat._id}
                          className={`w-full text-left px-4 py-3 mx-2 my-1 transition-all duration-300 ${
                            chat._id === activeChatId
                              ? 'bg-gradient-to-r from-[#5942E9] to-[#42DFE9] text-white rounded-xl'
                              : chat.isTitleLoading 
                                ? 'bg-gray-100 rounded-xl cursor-wait' 
                                : 'hover:bg-gray-100 rounded-xl text-gray-800'
                          } truncate flex items-center font-inter text-sm`}
                          onClick={() => !chat.isTitleLoading && selectChat(chat._id)}
                          disabled={chat.isTitleLoading}
                        >
                          {chat.isTitleLoading ? (
                            <div className="flex items-center gap-2 w-full">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-[#42DFE9] rounded-full animate-[bounce_1s_infinite]" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-[#42DFE9] rounded-full animate-[bounce_1s_infinite]" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-[#42DFE9] rounded-full animate-[bounce_1s_infinite]" style={{ animationDelay: '300ms' }}></div>
                              </div>
                              <span className="text-gray-600 text-sm font-medium ml-2">Generating Title...</span>
                            </div>
                          ) : (
                            <span className={`truncate ${chat._id !== activeChatId ? 'text-gray-800' : ''}`}>
                              {chat.title || 'New Chat'}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {isCollapsed && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute top-4 -right-10 bg-gray-100 p-2 rounded-full hover:bg-gray-200"
          >
            <FontAwesomeIcon icon={faChevronRight} className="text-black" />
          </button>
        )}
      </motion.div>

      {/* Main Content */}
      <div className="flex-grow h-full flex flex-col overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-grow flex flex-col h-full overflow-hidden"
        >
          <div className="px-6 py-3 flex-shrink-0">
            <div className="max-w-[1200px] w-full mx-auto px-4">
              <div className="flex justify-between items-center w-full">
                <div className="pl-2">
                  <Link href="/" passHref>
                    <Image src="/assets/images/logo.png" alt="Logo" width={120} height={40} className="cursor-pointer" />
                  </Link>
                </div>
                <div className="pr-2">
                  <UserProfile />
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {activeChat ? (
              activeChat.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-2xl font-sora text-gray-700 text-center">Welcome to VoxAi SQL</h2>
                    <p className="text-gray-500 font-inter text-center max-w-md mx-auto">
                      Start a conversation by typing your message or using voice input. I'll help you convert your natural language into SQL queries and provide you with the results.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col w-full pb-4">
                  {activeChat.messages.map((message, index) => (
                    <div 
                      key={message.id || message._id} 
                      className={`w-full py-6 ${
                        message.sender === "system" ? 'bg-gray-50' : 'bg-white'
                      }`}
                    >
                      <div className="max-w-3xl mx-auto px-4">
                        <div className={`flex items-start space-x-4 ${
                          message.sender === "user" ? 'flex-row-reverse space-x-reverse' : ''
                        }`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            message.sender === "system" ? 'bg-[#5942E9]' : 'bg-gray-300'
                          }`}>
                            {message.sender === "system" ? (
                              <FontAwesomeIcon icon={faRobot} className="text-white" />
                            ) : (
                              <FontAwesomeIcon icon={faUser} className="text-white" />
                            )}
                          </div>
                          
                          {message.sender === "system" ? (
                            <div className="flex-1 space-y-2">
                              <div className="text-sm font-sora text-gray-500">
                                VoxAi SQL
                              </div>
                              {message.isError ? (
                                <div className="text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 prose prose-sm max-w-none font-inter leading-relaxed">
                                  Error: {message.text}
                                </div>
                              ) : message.text.includes('SELECT') || message.text.includes('FROM') || message.text.includes('GROUP BY') ? (
                                <div className="bg-[#f8f9fc] text-[#5942E9] p-3 rounded-lg font-mono text-sm overflow-x-auto border border-[#e0e3f0]">
                                  {message.text}
                                </div>
                              ) : (
                                <div className="prose prose-sm max-w-none font-inter leading-relaxed text-gray-800">
                                  {message.text}
                                </div>
                              )}
                              {message.isQueryResult && message.queryResults && message.queryResults.length > 0 && (
                                <SQLResultCard results={message.queryResults} />
                              )}
                            </div>
                          ) : (
                            <div className="flex-1 space-y-2 text-right">
                              <div className="text-sm font-sora text-gray-500">
                                You
                              </div>
                              <div className="prose prose-sm max-w-none font-inter leading-relaxed text-gray-800">
                                {message.text}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <h2 className="text-2xl font-sora text-gray-700">Select a Chat</h2>
                <p className="text-gray-500 font-inter text-center max-w-md">
                  Choose a chat from the sidebar or create a new one to start a conversation.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Input Area */}
        <div className="w-full bg-white px-4 py-4">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSendMessage} className="w-full">
              <div className="flex items-center space-x-3 bg-gray-50 rounded-xl transition-colors duration-200">
                {/* Mode Toggle Button */}
                <div className="pl-3">
                  <button
                    type="button"
                    onClick={() => setIsSQLMode(!isSQLMode)}
                    className={`relative inline-flex items-center px-3 py-1.5 rounded-lg transition-all duration-300 ${
                      isSQLMode 
                        ? 'bg-gradient-to-r from-[#5942E9] to-[#42DFE9] text-white shadow-md' 
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-[#5942E9]'
                    }`}
                  >
                    <span className={`text-sm font-medium font-sora transition-all duration-300 ${
                      isSQLMode ? 'text-white' : 'text-gray-600'
                    }`}>
                      {isSQLMode ? (
                        <div className="flex items-center gap-2">
                          <FontAwesomeIcon icon={faDatabase} className="text-xs" />
                          <span>SQL Mode</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <FontAwesomeIcon icon={faChartLine} className="text-xs" />
                          <span>Text Mode</span>
                        </div>
                      )}
                    </span>
                  </button>
                </div>
                <button 
                  type="button" 
                  className="relative p-3 text-gray-400 hover:text-gray-600 transition-colors" 
                  onClick={toggleRecording}
                >
                  {isRecording && (
                    <div className="absolute -top-24 left-1/2 -translate-x-1/2">
                      <Player
                        autoplay
                        loop
                        src={recordingAnimation}
                        style={{ height: '100px', width: '100px' }}
                      />
                    </div>
                  )}
                  <FontAwesomeIcon icon={faMicrophone} color={isRecording ? '#5942E9' : 'currentColor'} size="lg" />
                </button>
                <textarea
                  className={`flex-grow py-3 px-2 bg-transparent focus:outline-none resize-none font-inter text-black placeholder-gray-400 min-h-[24px] max-h-[200px] ${
                    isTranscribing ? 'text-gray-400 animate-pulse' : ''
                  }`}
                  value={isTranscribing ? 'Transcribing...' : input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    autoResize(e.target);
                  }}
                  placeholder="Type a message..."
                  disabled={!activeChat || isTranscribing || isSending}
                  rows={1}
                />
                <button
                  type="submit"
                  className={`p-3 text-gray-400 hover:text-[#5942E9] transition-colors ${
                    isSending ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                  disabled={isSending || !input.trim()}
                >
                  {isSending ? (
                    <FontAwesomeIcon icon={faSpinner} spin className="text-gray-400" />
                  ) : (
                    <FontAwesomeIcon icon={faPaperPlane} size="lg" />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {showDBModal && (
        <DBIntegrationModal 
          showModal={showDBModal} 
          closeModal={() => setShowDBModal(false)}
          onConnectionChange={handleDatabaseConnectionChange}
        />
      )}
    </div>
  );
}