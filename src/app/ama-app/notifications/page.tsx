'use client';

import { useState } from 'react';
import NotificationForm from './components/NotificationForm';
import OverlordSidebar from "@/components/navigation/OverlordSidebar";
import NotificationHistoryModal from './components/NotificationHistoryModal';
import { FaHistory } from 'react-icons/fa';

export default function NotificationsPage() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
    <OverlordSidebar>
      <div className="flex flex-col h-full">
        <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">App Notifications</h1>
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
            >
              <FaHistory />
              View History
            </button>
        </header>
        
        <main className="flex-1 p-6 bg-gray-50 overflow-y-auto">
           <div className="max-w-4xl mx-auto w-full">
              <NotificationForm />
              
              {/* Helper Text / Info Section */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <h3 className="font-semibold text-blue-800 mb-2">Standard Broadcasts</h3>
                      <p>Send immediate alerts to user groups based on their role (Clients, Advocates, or All Users). Notifications are saved to their respective history logs.</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                      <h3 className="font-semibold text-purple-800 mb-2">Weekly Reminders</h3>
                      <p>Target users subscribed to specific weekly topics (e.g., First Week). These are marked as "Weekly Notifications" in the database for tracking.</p>
                  </div>
              </div>
           </div>
        </main>

        <NotificationHistoryModal 
          isOpen={isHistoryOpen} 
          onClose={() => setIsHistoryOpen(false)} 
        />
      </div>
    </OverlordSidebar>
  );
}













