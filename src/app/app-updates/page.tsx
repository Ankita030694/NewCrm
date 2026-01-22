'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import ImageSection from './components/ImageSection';
import OverlordSidebar from "@/components/navigation/OverlordSidebar";
import { FaLock } from 'react-icons/fa';

export default function AppUpdatesPage() {
  const { userRole, loading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (userRole === 'overlord') {
        setIsAuthorized(true);
      } else {
        // Optionally redirect or just show unauthorized state
         router.push('/login'); 
      }
    }
  }, [userRole, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-500">
        Loading...
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full">
            <FaLock className="text-5xl text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">You do not have permission to view this page.</p>
            <p className="text-gray-500 text-sm mt-4 bg-gray-100 py-1 px-3 rounded-full inline-block">Required role: Overlord</p>
        </div>
      </div>
    );
  }

  return (
    <OverlordSidebar>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">
            App Updates Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage images for the AMA App sections.
          </p>
        </header>

        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ImageSection sectionName="home" title="Home Section" />
                <ImageSection sectionName="ama" title="AMA Section" />
                <ImageSection sectionName="services" title="Services Section" />
                <ImageSection sectionName="casedesk" title="Casedesk Section" />
            </div>
        </main>
      </div>
    </OverlordSidebar>
  );
}
