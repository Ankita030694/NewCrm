'use client';

import NotificationForm from './components/NotificationForm';
import OverlordSidebar from "@/components/navigation/OverlordSidebar";

export default function NotificationsPage() {
  return (
    <OverlordSidebar>
      <div className="flex flex-col h-full">
        <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">App Notifications</h1>
        </header>
        
        <main className="flex-1 p-6 bg-gray-50">
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
      </div>
    </OverlordSidebar>
  );
}






