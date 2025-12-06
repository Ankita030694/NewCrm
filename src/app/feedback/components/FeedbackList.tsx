'use client';

import { AppFeedback } from '../types';
import { useEffect, useRef } from 'react';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';

interface FeedbackListProps {
  feedbacks: AppFeedback[];
  hasMore: boolean;
  loading: boolean;
  loadMore: () => void;
}

function formatDate(isoString: string) {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleString();
}

function renderStars(rate: number) {
  const stars = [];
  const fullStars = Math.floor(rate);
  const hasHalfStar = rate % 1 !== 0;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<FaStar key={i} className="text-yellow-400 w-4 h-4" />);
    } else if (i === fullStars && hasHalfStar) {
      stars.push(<FaStarHalfAlt key={i} className="text-yellow-400 w-4 h-4" />);
    } else {
      stars.push(<FaRegStar key={i} className="text-gray-300 w-4 h-4" />);
    }
  }
  return <div className="flex gap-0.5">{stars}</div>;
}

export default function FeedbackList({ feedbacks, hasMore, loading, loadMore }: FeedbackListProps) {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {feedbacks.length === 0 && !loading ? (
         <div className="col-span-full text-center py-10 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-500">
           No feedback found.
         </div>
      ) : (
        feedbacks.map((item) => (
          <div 
              key={item.id} 
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all flex flex-col h-full"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                 <span className="text-2xl font-bold text-gray-900">{item.rate}</span>
                 {renderStars(item.rate)}
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {formatDate(item.submittedAt)}
              </span>
            </div>

            <div className="flex-1">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {item.feedback}
              </p>
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 font-mono flex justify-end">
               ID: {item.id.slice(0, 8)}...
            </div>
          </div>
        ))
      )}
      
      {/* Sentinel for infinite scroll */}
      <div ref={observerTarget} className="col-span-full h-16 flex items-center justify-center">
        {loading ? (
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
            <span className="text-sm">Loading more feedback...</span>
          </div>
        ) : (
          !hasMore && feedbacks.length > 0 && (
            <span className="text-gray-500 text-sm font-medium">End of list</span>
          )
        )}
      </div>
    </div>
  );
}












