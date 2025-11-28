'use client';

import { AppLead } from '../types';
import { useEffect, useRef } from 'react';

interface AppLeadsTableProps {
  leads: AppLead[];
  hasMore: boolean;
  loading: boolean;
  loadMore: () => void;
}

export default function AppLeadsTable({ leads, hasMore, loading, loadMore }: AppLeadsTableProps) {
  const observerTarget = useRef<HTMLDivElement>(null);

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

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '-';
    // Assuming timestamp is in seconds as per user input sample (1762944183)
    // Multiplied by 1000 for JS Date
    return new Date(timestamp * 1000).toLocaleString();
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">State</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Source</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">Query</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.length === 0 && !loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  No leads found.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      {lead.created_at
                        ? new Date(lead.created_at * 1000).toLocaleDateString()
                        : '-'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {lead.created_at
                        ? new Date(lead.created_at * 1000).toLocaleTimeString()
                        : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{lead.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.phone} <br /> {lead.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.state}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.source}</td>

                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={lead.query}>{lead.query}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Sentinel element for infinite scroll */}
      <div ref={observerTarget} className="h-16 w-full flex items-center justify-center p-4 bg-gray-50 border-t border-gray-200">
        {loading ? (
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
            <span className="text-sm">Loading more leads...</span>
          </div>
        ) : (
          !hasMore && leads.length > 0 && (
            <span className="text-gray-500 text-sm font-medium">End of list</span>
          )
        )}
      </div>
    </div>
  );
}

