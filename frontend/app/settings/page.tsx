'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import withAuth from '../components/withAuth';
import { motion } from 'framer-motion';
import Link from 'next/link';
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

interface User {
  username: string;
  email: string;
}

function SettingsPage() {
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<User>({ username: '', email: '' });
  const [databases, setDatabases] = useState<Database[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const [profileRes, databasesRes] = await Promise.all([
          axios.get('http://localhost:3001/user/profile', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get('http://localhost:3001/database/getAll', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!isMounted) return;

        if (profileRes.data && typeof profileRes.data === 'object') {
          setUser({
            username: profileRes.data.username || '',
            email: profileRes.data.email || ''
          });
        }

        if (databasesRes.data && Array.isArray(databasesRes.data.databases)) {
          setDatabases(databasesRes.data.databases);
        }
      } catch (error: any) {
        console.error('Failed to fetch data:', error);
        if (!isMounted) return;
        
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
        } else {
          setErrorMessage('Failed to load user data. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setUser(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await axios.put(
        'http://localhost:3001/user/profile',
        { username: user.username, email: user.email },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data) {
        setMessage('Profile updated successfully!');
        setErrorMessage('');
      }
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
      } else {
        setErrorMessage(error.response?.data?.message || 'Failed to update profile. Please try again.');
      }
      setMessage('');
    }

    setTimeout(() => {
      setMessage('');
      setErrorMessage('');
    }, 3000);
  };

  const handleEdit = async (id: string) => {
    const newDbName = prompt('Enter new database name:');
    if (!newDbName) return;

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await axios.put(
        `http://localhost:3001/database/${id}`,
        { dbName: newDbName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && response.data.database) {
        setDatabases(prevDbs => prevDbs.map((db) => 
          db._id === id ? response.data.database : db
        ));
        setMessage('Database updated successfully!');
        setErrorMessage('');
      }
    } catch (error: any) {
      console.error('Failed to update database:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
      } else {
        setErrorMessage(error.response?.data?.message || 'Failed to update database. Please try again.');
      }
      setMessage('');
    }

    setTimeout(() => {
      setMessage('');
      setErrorMessage('');
    }, 3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this database?')) return;

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      await axios.delete(`http://localhost:3001/database/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setDatabases(prevDbs => prevDbs.filter((db) => db._id !== id));
      setMessage('Database deleted successfully!');
      setErrorMessage('');
    } catch (error: any) {
      console.error('Failed to delete database:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
      } else {
        setErrorMessage(error.response?.data?.message || 'Failed to delete database. Please try again.');
      }
      setMessage('');
    }

    setTimeout(() => {
      setMessage('');
      setErrorMessage('');
    }, 3000);
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className={`min-h-screen bg-gradient-to-r from-[#5942E9] to-[#42DFE9] p-8 ${inter.variable} ${sora.variable}`}>
      <motion.div
        className="max-w-6xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="p-8">
          <h1 className="text-4xl font-bold text-center text-[#5942E9] font-sora mb-8">Settings</h1>
          
          {/* Notification Messages */}
          {(message || errorMessage) && (
            <motion.div 
              className={`mb-6 p-4 rounded-xl ${message ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'} font-inter text-center`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {message || errorMessage}
            </motion.div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5942E9]"></div>
            </div>
          ) : (
            <>
              {/* User Profile Section */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-[#5942E9] font-sora mb-6">User Profile</h2>
                <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
                  <div>
                    <label className="block text-gray-700 font-medium font-inter mb-2">Username</label>
                    <input
                      type="text"
                      name="username"
                      value={user.username}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#5942E9] focus:ring-1 focus:ring-[#5942E9] transition-colors font-inter text-black"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium font-inter mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={user.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#5942E9] focus:ring-1 focus:ring-[#5942E9] transition-colors font-inter text-black"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#5942E9] to-[#42DFE9] text-white py-3 rounded-xl font-medium hover:opacity-90 transition-opacity font-inter"
                  >
                    Save Changes
                  </button>
                </form>
              </div>

              {/* Database Management Section */}
              <div>
                <h2 className="text-2xl font-bold text-[#5942E9] font-sora mb-6">Manage Databases</h2>
                <div className="space-y-4">
                  {databases.length === 0 ? (
                    <p className="text-center text-gray-500 font-inter py-8">No databases available</p>
                  ) : (
                    databases.map((db) => (
                      <div
                        key={db._id}
                        className="bg-gray-50 rounded-xl p-6 flex items-center justify-between transition-all hover:shadow-md"
                      >
                        <div className="flex-1">
                          <h3 className="text-xl font-medium text-[#5942E9] font-sora mb-1">{db.dbName}</h3>
                          <p className="text-gray-600 font-inter text-sm">
                            {db.host}:{db.port}
                            {db.isConnected && (
                              <span className="ml-2 text-green-500 font-medium">(Connected)</span>
                            )}
                          </p>
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleEdit(db._id)}
                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#5942E9] to-[#42DFE9] text-white font-medium hover:opacity-90 transition-opacity font-inter"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(db._id)}
                            className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:opacity-90 transition-opacity font-inter"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>

      <div className="mt-6 text-center">
        <Link href="/chats">
          <button className="bg-white text-[#5942E9] px-6 py-3 rounded-xl font-medium hover:bg-opacity-90 transition-opacity font-inter">
            Back to Chats
          </button>
        </Link>
      </div>
    </div>
  );
}

export default withAuth(SettingsPage);
