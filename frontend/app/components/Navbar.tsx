'use client';

import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="py-4 border-b flex justify-between">
      <h1 className="text-3xl font-bold">VoxAi SQL</h1>
      <ul className="flex space-x-4">
        <li>
          <Link href="/chats" className="text-blue-500 hover:text-blue-700">
            Chats
          </Link>
        </li>
        <li>
          <Link href="/settings" className="text-blue-500 hover:text-blue-700">
            Settings
          </Link>
        </li>
        <li>
          <Link href="/db-integration" className="text-blue-500 hover:text-blue-700">
            DB Integration
          </Link>
        </li>
      </ul>
    </nav>
  );
}
