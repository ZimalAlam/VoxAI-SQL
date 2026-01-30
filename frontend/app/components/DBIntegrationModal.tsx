'use client';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faDatabase, faPlus, faLink, faUnlink, faCheck } from '@fortawesome/free-solid-svg-icons';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { Inter, Sora } from 'next/font/google';

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

// Dynamically load Lottie Player for animations
const Player = dynamic(() => import('@lottiefiles/react-lottie-player').then((mod) => mod.Player), {
  ssr: false,
});

interface Database {
  _id: string;
  dbName: string;
  host: string;
  port: number;
  username: string;
  password: string;
  isConnected: boolean;
  user: string;
}

interface DBIntegrationModalProps {
  showModal: boolean;
  closeModal: () => void;
  onConnectionChange?: (dbId: string | null) => void;
}

export default function DBIntegrationModal({ showModal, closeModal, onConnectionChange }: DBIntegrationModalProps) {
  const [dbName, setDbName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [existingDbs, setExistingDbs] = useState<Database[]>([]);
  const [selectedDb, setSelectedDb] = useState('');
  const [isNewDb, setIsNewDb] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [message, setMessage] = useState('');
  const [animationType, setAnimationType] = useState<'none' | 'success' | 'error'>('none');
  const [connectedDb, setConnectedDb] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Add a state to track when we need to refresh the database list
  const [shouldRefetch, setShouldRefetch] = useState(false);

  useEffect(() => {
    const fetchDbs = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      setIsLoading(true);
      try {
        // First get all databases
        const response = await fetch('http://localhost:3001/database/getAll', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        
        if (response.ok && Array.isArray(data.databases)) {
          // Then get the active database
          const activeResponse = await fetch('http://localhost:3001/database/active', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });
          const activeData = await activeResponse.json();

          if (activeResponse.ok && activeData.activeDatabase) {
            const activeId = activeData.activeDatabase._id;
            setConnectedDb(activeId);
            setSelectedDb(activeId);
            setExistingDbs(data.databases.map((db: Database) => ({
              ...db,
              isConnected: db._id === activeId
            })));
          } else {
            setExistingDbs(data.databases);
          }
        }
      } catch (error) {
        console.error('Error fetching databases:', error);
        setMessage('Failed to fetch databases. Please try again.');
        setAnimationType('error');
        setShowAnimation(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (showModal) {
      fetchDbs();
    }
  }, [showModal, shouldRefetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('http://localhost:3001/database/add', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ dbName, host, port: parseInt(port), username, password }),
      });

      const data = await response.json();
      if (response.ok) {
        setAnimationType('success');
        setMessage(data.message || 'Database added successfully!');
        setShouldRefetch(prev => !prev); // Trigger a refetch
        setShowAnimation(true);
        setTimeout(() => {
          setShowAnimation(false);
          // Reset form
          setDbName('');
          setHost('');
          setPort('');
          setUsername('');
          setPassword('');
          setIsNewDb(false); // Switch back to connect view
        }, 3000);
      } else {
        throw new Error(data.message || 'Failed to add database');
      }
    } catch (error: any) {
      setAnimationType('error');
      setMessage(error.message || 'An error occurred while adding the database.');
      setShowAnimation(true);
      setTimeout(() => setShowAnimation(false), 3000);
    }
  };

  const handleConnect = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setIsConnecting(true);
    setConnectionAttempts(prev => prev + 1);

    try {
      const response = await fetch(`http://localhost:3001/database/connect/${selectedDb}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setConnectedDb(selectedDb);
        setMessage('Database connected successfully!');
        setAnimationType('success');
        onConnectionChange?.(selectedDb);

        // Update the existing databases list
        setExistingDbs(prev => prev.map(db => ({
          ...db,
          isConnected: db._id === selectedDb
        })));
      } else {
        throw new Error(data.message || 'Failed to connect to database');
      }
    } catch (error) {
      console.error('Error connecting to database:', error);
      setMessage('Failed to connect to database. Please try again.');
      setAnimationType('error');

      // Implement retry logic
      if (connectionAttempts < 3) {
        setTimeout(() => handleConnect(), 1000); // Retry after 1 second
      } else {
        setMessage('Failed to connect after multiple attempts. Please check your database settings.');
      }
    } finally {
      setShowAnimation(true);
      setIsConnecting(false);
      if (connectionAttempts >= 3) {
        setConnectionAttempts(0);
      }
    }
  };

  const handleDisconnect = async () => {
    const token = localStorage.getItem('token');
    if (!token || !connectedDb) return;

    setIsConnecting(true);
    try {
      const response = await fetch(`http://localhost:3001/database/disconnect/${connectedDb}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setConnectedDb(null);
        setMessage('Database disconnected successfully!');
        setAnimationType('success');
        onConnectionChange?.(null);

        // Update the existing databases list
        setExistingDbs(prev => prev.map(db => ({
          ...db,
          isConnected: false
        })));
      } else {
        throw new Error(data.message || 'Failed to disconnect database');
      }
    } catch (error) {
      console.error('Error disconnecting database:', error);
      setMessage('Failed to disconnect database. Please try again.');
      setAnimationType('error');
    } finally {
      setShowAnimation(true);
      setIsConnecting(false);
    }
  };

  if (!showModal) return null;

  return (
    <motion.div
      className={`fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 ${inter.variable} ${sora.variable}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={closeModal}
    >
      <motion.div
        className="bg-white rounded-2xl max-w-md w-full mx-4 relative shadow-2xl"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-[#5942E9] font-sora">Database Integration</h2>
            <button 
              onClick={closeModal} 
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} className="text-gray-400 hover:text-red-500 transition-colors" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {connectedDb ? (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 font-inter mb-1">Connected Database</h3>
                    <p className="text-lg font-medium text-[#5942E9] font-sora">
                      {existingDbs.find(db => db._id === connectedDb)?.dbName}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <FontAwesomeIcon icon={faCheck} className="text-green-500 mr-2" />
                    <span className="text-sm font-medium text-green-500">Connected</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleDisconnect}
                  className="flex-1 py-2.5 px-4 rounded-xl font-medium bg-red-500 text-white hover:bg-red-600 transition-colors shadow-md"
                >
                  <FontAwesomeIcon icon={faUnlink} className="mr-2" />
                  Disconnect
                </button>
                <button
                  onClick={() => setIsNewDb(true)}
                  className="flex-1 py-2.5 px-4 rounded-xl font-medium bg-gradient-to-r from-[#5942E9] to-[#42DFE9] text-white shadow-md hover:opacity-90 transition-opacity"
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Add New
                </button>
              </div>

              {existingDbs.length > 1 && (
                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">or connect another database</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <select
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#5942E9] focus:ring-1 focus:ring-[#5942E9] transition-colors font-inter text-black"
                      value={selectedDb}
                      onChange={(e) => setSelectedDb(e.target.value)}
                    >
                      <option value="">Choose a database...</option>
                      {existingDbs.filter(db => db._id !== connectedDb).map((db) => (
                        <option key={db._id} value={db._id}>
                          {db.dbName}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleConnect}
                      disabled={!selectedDb}
                      className="w-full mt-3 bg-gradient-to-r from-[#5942E9] to-[#42DFE9] text-white py-2.5 px-6 rounded-xl font-medium shadow-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FontAwesomeIcon icon={faLink} className="mr-2" />
                      Switch to Selected Database
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Toggle Buttons */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setIsNewDb(false)}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition-all duration-200 ${
                    !isNewDb 
                      ? 'bg-gradient-to-r from-[#5942E9] to-[#42DFE9] text-white shadow-md' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <FontAwesomeIcon icon={faLink} className="mr-2" />
                  Connect Existing
                </button>
                <button
                  onClick={() => setIsNewDb(true)}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition-all duration-200 ${
                    isNewDb 
                      ? 'bg-gradient-to-r from-[#5942E9] to-[#42DFE9] text-white shadow-md' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Add New
                </button>
              </div>

              {!isNewDb ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 font-medium mb-2 font-inter">Select Database</label>
                    <select
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#5942E9] focus:ring-1 focus:ring-[#5942E9] transition-colors font-inter text-black"
                      value={selectedDb}
                      onChange={(e) => setSelectedDb(e.target.value)}
                    >
                      <option value="">Choose a database...</option>
                      {existingDbs.map((db) => (
                        <option key={db._id} value={db._id}>
                          {db.dbName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleConnect}
                    disabled={!selectedDb}
                    className="w-full bg-gradient-to-r from-[#5942E9] to-[#42DFE9] text-white py-2.5 px-6 rounded-xl font-medium shadow-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FontAwesomeIcon icon={faLink} className="mr-2" />
                    Connect to Database
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-gray-700 font-medium mb-1.5 font-inter text-sm">Database Name</label>
                    <input
                      type="text"
                      value={dbName}
                      onChange={(e) => setDbName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#5942E9] focus:ring-1 focus:ring-[#5942E9] transition-colors font-inter text-black"
                      required
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-gray-700 font-medium mb-1.5 font-inter text-sm">Host</label>
                    <input
                      type="text"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#5942E9] focus:ring-1 focus:ring-[#5942E9] transition-colors font-inter text-black"
                      required
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-gray-700 font-medium mb-1.5 font-inter text-sm">Port</label>
                    <input
                      type="number"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#5942E9] focus:ring-1 focus:ring-[#5942E9] transition-colors font-inter text-black"
                      required
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-gray-700 font-medium mb-1.5 font-inter text-sm">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#5942E9] focus:ring-1 focus:ring-[#5942E9] transition-colors font-inter text-black"
                      required
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-gray-700 font-medium mb-1.5 font-inter text-sm">Password <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#5942E9] focus:ring-1 focus:ring-[#5942E9] transition-colors font-inter text-black"
                      placeholder="Leave empty if no password"
                    />
                  </div>
                  <button
                    type="submit"
                    className="col-span-2 bg-gradient-to-r from-[#5942E9] to-[#42DFE9] text-white py-2.5 px-6 rounded-xl font-medium shadow-md hover:opacity-90 transition-opacity"
                  >
                    <FontAwesomeIcon icon={faDatabase} className="mr-2" />
                    Integrate Database
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        {/* Animation Overlay */}
        {showAnimation && (
          <motion.div 
            className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-white bg-opacity-10 p-8 rounded-2xl backdrop-blur-md">
              <Player
                autoplay
                loop
                src={animationType === 'success' ? "/assets/animations/DByes.json" : "/assets/animations/DBno.json"}
                style={{ height: '120px', width: '120px' }}
              />
              <p className="text-white text-lg font-medium mt-4 text-center px-6 text-shadow">{message}</p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
