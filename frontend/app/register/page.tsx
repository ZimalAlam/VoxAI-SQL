'use client';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useRouter } from 'next/navigation'; // For navigation after successful registration
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFacebookF, faGoogle, faLinkedinIn } from '@fortawesome/free-brands-svg-icons';
import { motion } from 'framer-motion';
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';

config.autoAddCss = false;

const Player = dynamic(() => import('@lottiefiles/react-lottie-player').then(mod => mod.Player), {
  ssr: false,
});

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agree: false,
  });
  const [errors, setErrors] = useState({
    confirmPassword: '',
    agree: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const router = useRouter(); // For navigation

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prevForm) => ({
      ...prevForm,
      agree: e.target.checked,
    }));
  };

  const validateForm = () => {
    let valid = true;
    const newErrors = {
      confirmPassword: '',
      agree: '',
    };

    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      valid = false;
    }

    if (!form.agree) {
      newErrors.agree = 'You must agree to the terms and conditions';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
  
    setIsSubmitting(true);
  
    try {
      const response = await fetch('http://localhost:3001/user/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
        }),
      });
  
      const data = await response.json();
      console.log(data); // Log the response data for debugging
  
      if (response.ok) {
        setIsSuccess(true);
        setMessage('Registration successful!');
        setShowAnimation(true);
  
        setTimeout(() => {
          setShowAnimation(false);
          router.push('/login');
        }, 3000);
      } else {
        setIsSuccess(false);
        setMessage(data.message || 'Registration failed. Please try again.');
        setShowAnimation(true);
        
        setTimeout(() => {
          setShowAnimation(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error registering user:', error);
      setIsSuccess(false);
      setMessage('An error occurred. Please try again.');
      setShowAnimation(true);
      
      setTimeout(() => {
        setShowAnimation(false);
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  };
  

  return (
    <div className="min-h-screen flex flex-col justify-between items-center bg-white font-sans">
      {/* Logo on the top left */}
      <motion.div className="absolute top-5 left-5" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 1 } }}>
        <Link href="/">
          <Image src="/assets/images/logo.png" alt="VoxAi SQL Logo" width={150} height={150} className="cursor-pointer" />
        </Link>
      </motion.div>

      {/* Main Content with form and animation */}
      <div className="flex justify-between items-start max-w-7xl w-full px-20 mt-16">
        {/* Registration Form in rounded div */}
        <motion.div
          className="w-1/2 bg-white rounded-lg p-10 shadow-lg"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 1 } }}
        >
          {/* Header with Register your account & Register with */}
          <div className="flex justify-between items-center mb-6">
            <span className="text-xl text-[#5942E9] font-sora">Create your account</span>
            <div className="text-center">
              <span className="block mb-2 text-gray-600">Register with</span>
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

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div className="form-group" whileHover={{ scale: 1.05 }}>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleInputChange}
                placeholder="Username"
                className="w-full px-6 py-3 border border-gray-300 rounded-md focus:border-[#5942E9] text-[#5942E9] text-lg font-inter"
                required
              />
            </motion.div>

            <motion.div className="form-group" whileHover={{ scale: 1.05 }}>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleInputChange}
                placeholder="Email"
                className="w-full px-6 py-3 border border-gray-300 rounded-md focus:border-[#5942E9] text-[#5942E9] text-lg font-inter"
                required
              />
            </motion.div>

            <motion.div className="form-group" whileHover={{ scale: 1.05 }}>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleInputChange}
                placeholder="Password"
                className="w-full px-6 py-3 border border-gray-300 rounded-md focus:border-[#5942E9] text-[#5942E9] text-lg font-inter"
                required
              />
            </motion.div>

            <motion.div className="form-group" whileHover={{ scale: 1.05 }}>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm Password"
                className="w-full px-6 py-3 border border-gray-300 rounded-md focus:border-[#5942E9] text-[#5942E9] text-lg"
                required
              />
              {errors.confirmPassword && (
                <span className="text-red-600 text-sm">{errors.confirmPassword}</span>
              )}
            </motion.div>

            <div className="flex items-center justify-between space-x-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={form.agree}
                  onChange={handleCheckboxChange}
                  className="mr-2"
                  required
                />
                <span className="text-gray-500">
                  I agree to the{' '}
                  <Link href="/terms" className="text-[#5942E9]">
                    Terms & Conditions
                  </Link>
                </span>
              </div>

              <motion.button
                type="submit"
                className="w-28 bg-[#5942E9] text-white py-2 rounded-lg hover:bg-blue-700 transition-all"
                whileHover={{ scale: 1.05 }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Register'}
              </motion.button>
            </div>

            {errors.agree && <span className="text-red-600 text-sm">{errors.agree}</span>}
          </form>

          {/* Success or Error Message */}
          {showAnimation && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            {isSuccess ? (
              <Player
                autoplay
                loop={false}  // Play once
                src="/assets/animations/success.json"  // Replace with the path to your success Lottie animation
                style={{ height: '200px', width: '200px' }}
              />
            ) : (
              <Player
                autoplay
                loop={false}  // Play once
                src="/assets/animations/failure.json"  // Replace with the path to your failure Lottie animation
                style={{ height: '200px', width: '200px' }}
              />
            )}
            <p className="text-center mt-4 text-lg">
              {message}
            </p>
          </div>
        </div>
      )}
        </motion.div>

        {/* Right Side - Lottie Animation */}
        <motion.div
          className="w-1/2 flex justify-end items-start mt-10"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 1 } }}
        >
          <Player
            autoplay
            loop
            src="/assets/animations/register-animation.json" // Replace with your Lottie animation path
            style={{ height: '450px', width: '450px' }}
          />
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        className="text-center mt-6 bg-white py-4 w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 1 } }}
      >
        <p className="text-gray-500 text-sm">
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
