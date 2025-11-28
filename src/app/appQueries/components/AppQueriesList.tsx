'use client';

import { AppQuery } from '../types';
import { useEffect, useRef, useState } from 'react';
import QueryDetailsModal from './QueryDetailsModal';

interface AppQueriesListProps {
  queries: AppQuery[];
  hasMore: boolean;
  loading: boolean;
  loadMore: () => void;
}

function formatDate(timestamp: number) {
  if (!timestamp) return '-';
  return new Date(timestamp * 1000).toLocaleDateString();
}

function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'resolved':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export default function AppQueriesList({ queries, hasMore, loading, loadMore }: AppQueriesListProps) {
  const observerTarget = useRef<HTMLDivElement>(null);
  const [selectedQuery, setSelectedQuery] = useState<AppQuery | null>(null);

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

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {queries.length === 0 && !loading ? (
           <div className="col-span-full text-center py-10 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-500">
             No queries found.
           </div>
        ) : (
          queries.map((query) => (
            <div 
                key={query.id} 
                onClick={() => setSelectedQuery(query)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all cursor-pointer flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(query.status)}`}>
                   {query.status}
                </span>
                <span className="text-xs text-gray-400">
                  {formatDate(query.submitted_at)}
                </span>
              </div>

              <div className="flex-1 mb-4">
                <h3 className="text-sm font-medium text-gray-900 line-clamp-3 mb-2">
                  Query: {query.query}
                </h3>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                   <span className="font-medium">Remarks:</span> {query.remarks}
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100 mt-auto">
                 <div className="flex justify-between items-center text-xs">
                    <div className="font-medium text-gray-700 truncate max-w-[50%]" title={query.phone}>
                       <span className="text-gray-400 block text-[10px] uppercase">Submitted By</span>
                       {query.posted_by}({query.phone})
                    </div>
                    {query.alloc_adv ? (
                        <div className="text-gray-600 truncate max-w-[45%] text-right" title={query.alloc_adv}>
                           <span className="text-gray-400 block text-[10px] uppercase">Assigned Adv</span>
                           {query.alloc_adv}
                        </div>
                    ) : (
                        <div className="text-gray-400 italic text-right">
                           <span className="text-gray-400 block text-[10px] uppercase">Assigned Adv</span>
                           Unassigned
                        </div>
                    )}
                 </div>
              </div>
            </div>
          ))
        )}
        
        {/* Sentinel for infinite scroll */}
        <div ref={observerTarget} className="col-span-full h-16 flex items-center justify-center">
          {loading ? (
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
              <span className="text-sm">Loading more queries...</span>
            </div>
          ) : (
            !hasMore && queries.length > 0 && (
              <span className="text-gray-500 text-sm font-medium">End of list</span>
            )
          )}
        </div>
      </div>

      {selectedQuery && (
        <QueryDetailsModal 
           query={selectedQuery} 
           onClose={() => setSelectedQuery(null)} 
        />
      )}
    </>
  );
}
