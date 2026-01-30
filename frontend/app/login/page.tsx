'use client';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFacebookF, faGoogle, faLinkedinIn } from '@fortawesome/free-brands-svg-icons';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { useRouter } from 'next/navigation';

config.autoAddCss = false;

const Player = dynamic(() => import('@lottiefiles/react-lottie-player').then(mod => mod.Player), {
  ssr: false,
});

export default function LoginPage() {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showAnimation, setShowAnimation] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
  
    try {
      const response = await fetch('http://localhost:3001/user/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        // Save the token in localStorage
        localStorage.setItem('token', data.token); // Store the token in localStorage
        setShowAnimation(true);
        setMessage('Login successful! Redirecting to chats...');
        setTimeout(() => {
          setShowAnimation(false); 
          router.push('/chats'); // Redirect to the chats page after animation
        }, 3000); // 3 seconds delay for animation
      } else {
        setMessage(data.message || 'Login failed. Please try again.');
        setShowAnimation(true);
        setTimeout(() => {
          setShowAnimation(false); 
        }, 3000);
      }
    } catch (error) {
      console.error('Error during login:', error);
      setMessage('An error occurred. Please try again.');
      setShowAnimation(true);
      setTimeout(() => {
        setShowAnimation(false);
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) {
    return null; 
  }

  return (
    <div className="min-h-screen flex flex-col justify-between items-center bg-white font-sans">
      {/* Logo */}
      <motion.div className="absolute top-5 left-5" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 1 } }}>
        <Link href="/">
            <Image src="/assets/images/logo.png" alt="VoxAi SQL Logo" width={150} height={150} className="cursor-pointer" />
        </Link>
      </motion.div>

      {/* Register Button */}
      <motion.div className="absolute top-5 right-5" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 1 } }}>
        <Link href="/register">
          <button className="bg-transparent border-2 border-[#5942E9] text-[#5942E9] px-4 py-2 rounded-lg hover:bg-[#5942E9] hover:text-white transition-all">
            Register
          </button>
        </Link>
      </motion.div>

      {/* Main Content */}
      <div className="flex justify-between items-start max-w-7xl w-full px-20 mt-24">
        {/* Login Form */}
        <motion.div
          className="w-1/2 bg-white rounded-lg p-10 shadow-lg"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 1 } }}
        >
          <div className="flex justify-between items-center mb-6">
            <span className="text-xl text-[#5942E9] font-sora">Login to your account</span>
            <div className="text-center">
              <span className="block mb-2 text-gray-600">Login with</span>
              <div className="flex space-x-4">
                <Link href="#">
                  <FontAwesomeIcon icon={faFacebookF} size="2x" style={{ color: '#3b5998' }} />
                </Link>
                <Link href="#">
                  <FontAwesomeIcon icon={faGoogle} size="2x" style={{ color: '#db4437' }} />
                </Link>
                <Link href="#">
                  <FontAwesomeIcon icon={faLinkedinIn} size="2x" style={{ color: '#0077b5' }} />
                </Link>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div className="form-group" whileHover={{ scale: 1.05 }}>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleInputChange}
                placeholder="Your Email"
                className="w-full px-6 py-3 border border-gray-300 rounded-md focus:border-[#5942E9] text-[#5942E9] text-lg font-inter"
                required
              />
            </motion.div>

            <motion.div className="form-group relative" whileHover={{ scale: 1.05 }}>
              <input
                type={passwordVisible ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleInputChange}
                placeholder="Password"
                className="w-full px-6 py-3 border border-gray-300 rounded-md focus:border-[#5942E9] text-[#5942E9] text-lg font-inter"
                required
              />
              <button type="button" className="absolute right-4 top-3" onClick={togglePasswordVisibility}>
                <FontAwesomeIcon icon={passwordVisible ? faEyeSlash : faEye} size="lg" />
              </button>
            </motion.div>

            <div className="flex justify-end">
              <motion.button
                type="submit"
                className="w-28 bg-[#5942E9] text-white py-2 rounded-lg hover:bg-blue-700 transition-all font-inter"
                whileHover={{ scale: 1.05 }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Logging in...' : 'Log in'}
              </motion.button>
            </div>
          </form>
        </motion.div>

        {/* Animation */}
        <motion.div
          className="w-1/2 flex justify-end items-start mt-10"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 1 } }}
        >
          <Player
            autoplay
            loop
            src="/assets/animations/login-animation.json" 
            style={{ height: '450px', width: '450px' }}
          />
        </motion.div>
      </div>

      {/* Success Animation */}
      {showAnimation && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <Player
              autoplay
              loop={false}
              src="/assets/animations/successlogin.json" 
              style={{ height: '200px', width: '200px' }}
            />
            <p className="text-center mt-4 text-lg font-inter">{message}</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <motion.div className="text-center mt-6 bg-white py-4 w-full" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 1 } }}>
        <p className="text-gray-500 text-sm font-inter">
          &copy; Copyright VoxAi SQL 2024 |{' '}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>{' '}
          |{' '}
          <Link href="/help" className="underline">
            Help
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
