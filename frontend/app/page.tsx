'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';


const Player = dynamic(() => import('@lottiefiles/react-lottie-player').then(mod => mod.Player), {
  ssr: false,
});

const logoVariants = {
  hidden: { opacity: 0, scale: 0 },
  visible: { opacity: 1, scale: 1, transition: { duration: 1 } },
};

const textVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 1, delay: 0.5 } },
};

const buttonVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 1, delay: 1 } },
};

export default function WelcomePage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // Ensures this runs only on the client-side
  }, []);

  if (!isClient) {
    return null; // Prevent SSR from rendering any client-specific code
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-r from-[#5942E9] to-[#42DFE9]">
      {/* Background Animation */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <Player
          autoplay
          loop
          src="/assets/animations/background-animation.json"  // Add a Lottie animation for the background
          style={{ width: '100vw', height: '100vh', opacity: 0.3 }} // Slightly faded to stay in the background
        />
      </div>

      <motion.h1
        className="text-5xl font-bold text-center relative z-10 mb-12 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-800 font-sora"
        variants={textVariants}
        initial="hidden"
        animate="visible"
      >
        Welcome to VoxAi SQL
      </motion.h1>

      {/* Content Section with Logo+Buttons on Left and Lottie Animation on Right */}
      <div className="flex items-center justify-between w-full max-w-6xl px-10 relative z-10">
        {/* Logo, Small Animation, and Buttons */}
        <motion.div
          className="flex flex-col items-center space-y-6 w-1/2 bg-black bg-opacity-70 p-8 rounded-lg"
          variants={logoVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between w-full">
            {/* Logo on the left */}
            <Image
              src="/assets/images/logo.png"
              alt="VoxAi SQL Logo"
              width={200}
              height={200}
              className="mr-4"
            />

            {/* Small Lottie animation next to the logo */}
            <Player
              autoplay
              loop
              src="/assets/animations/small-animation.json"  // Add your small Lottie animation here
              style={{ height: '150px', width: '150px', opacity: 0.7 }}  // Reduced opacity for transparency
            />
          </div>

          {/* Buttons for Login and Signup */}
          <motion.div
            className="flex flex-col space-y-4 w-full"
            variants={buttonVariants}
            initial="hidden"
            animate="visible"
          >
            <Link href="/login">
              <button className="bg-[#5942E9] text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-all duration-300 w-full text-center font-inter">
                Login
              </button>
            </Link>
            <Link href="/register">
              <button className="bg-[#5942E9] text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-all duration-300 w-full text-center font-inter">
                Sign Up
              </button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Main Lottie Animation on the Right */}
        <motion.div
          className="w-1/2 flex justify-center"
          variants={logoVariants}
          initial="hidden"
          animate="visible"
        >
          <Player
            autoplay
            loop
            src="/assets/animations/welcome-animation.json"
            style={{ height: '450px', width: '450px' }}  // Increased size
          />
        </motion.div>
      </div>

      {/* Footer Section */}
      {/* Footer Section with Gradient */}
      <div className="text-center mt-20 relative z-10 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-800 font-inter">
        <p>Your voice, your queries, your SQL—powered by VoxAi.</p>
      </div>
    </div>
  );
}
