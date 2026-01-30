import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faSignOutAlt, faCog, faComments } from '@fortawesome/free-solid-svg-icons';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation'; // Use usePathname for checking current page

export default function UserProfile() {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname(); // Get the current path

  // Toggle dropdown menu
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // Handle logout functionality
  const handleLogout = () => {
    localStorage.removeItem('token'); // Remove the token from local storage
    router.push('/login'); // Redirect to the login page
  };

  // Determine the navigation link and text based on the current path
  const isOnSettingsPage = pathname === '/settings';
  const navigateTo = isOnSettingsPage ? '/chats' : '/settings';
  const buttonText = isOnSettingsPage ? 'Chats' : 'Settings';
  const buttonIcon = isOnSettingsPage ? faComments : faCog;

  return (
    <div className="relative">
      {/* User Icon */}
      <FontAwesomeIcon
        icon={faUser}
        className="text-3xl cursor-pointer text-[#5942E9] hover:text-blue-700"
        onClick={toggleMenu}
      />

      {/* Dropdown Menu */}
      {menuOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg py-2">
          <a href={navigateTo} className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
            <FontAwesomeIcon icon={buttonIcon} className="mr-2 text-[#5942E9]" />
            {buttonText}
          </a>
          <button
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
          >
            <FontAwesomeIcon icon={faSignOutAlt} className="mr-2 text-[#5942E9]" />
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}
