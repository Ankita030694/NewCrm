'use client';

import { AppUser } from '../types';
import { useEffect, useRef, useState } from 'react';
import { FiEdit2 } from 'react-icons/fi';

interface AppUsersTableProps {
  users: AppUser[];
  hasMore: boolean;
  loading: boolean;
  loadMore: () => void;
  onStatusChange: (id: string, newStatus: string) => Promise<void>;
  onEditUser: (user: AppUser) => void;
}

function formatDateParts(timestamp: number) {
  if (!timestamp) return { date: '-', time: '' };
  const dateObj = new Date(timestamp * 1000);
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const date = `${day}-${month}-${year}`;
  const time = dateObj.toLocaleTimeString();
  return { date, time };
}

function formatStartDateDDMMYYYY(dateStr: string) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr; // fallback if not parsable as date
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

// Color mapping for roles
const getRoleColor = (role: string) => {
  switch (role?.toLowerCase()) {
    case 'admin':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'advocate':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'client':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'user':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export default function AppUsersTable({ users, hasMore, loading, loadMore, onStatusChange, onEditUser }: AppUsersTableProps) {
  const observerTarget = useRef<HTMLDivElement>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loading, loadMore]);

  const handleStatusChange = async (id: string, e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setUpdatingId(id);
    try {
        await onStatusChange(id, newStatus);
    } finally {
        setUpdatingId(null);
    }
  };

  return (
    <div className="overflow-hidden bg-white shadow-md rounded-lg border border-gray-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Created At</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Start Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.length === 0 && !loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const { date, time } = formatDateParts(user.created_at);
                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{date}</div>
                      <div className="text-xs text-gray-400">{time}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.phone} <br /> {user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <select
                        value={user.status}
                        onChange={(e) => handleStatusChange(user.id, e)}
                        disabled={updatingId === user.id}
                        className={`block w-full pl-3 pr-10 py-1 text-xs border-gray-300 focus:outline-none focus:ring-[#D2A02A] focus:border-[#D2A02A] sm:text-xs rounded-md ${
                            user.status === 'active' 
                                ? 'bg-green-50 text-green-800 border-green-200' 
                                : 'bg-red-50 text-red-800 border-red-200'
                        } ${updatingId === user.id ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatStartDateDDMMYYYY(user.start_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => onEditUser(user)}
                        className="text-[#D2A02A] hover:text-[#B8911E] transition-colors"
                        title="Edit User"
                      >
                        <FiEdit2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      <div ref={observerTarget} className="h-16 w-full flex items-center justify-center p-4 bg-gray-50 border-t border-gray-200">
        {loading ? (
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
            <span className="text-sm">Loading more users...</span>
          </div>
        ) : (
          !hasMore && users.length > 0 && (
            <span className="text-gray-500 text-sm font-medium">End of list</span>
          )
        )}
      </div>
    </div>
  );
}
