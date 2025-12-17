import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/firebase';

interface OpsPaymentsAnalytics {
  totalApprovedAmount: number;
  totalPendingAmount: number;
  totalRejectedAmount: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  totalCount: number;
}

interface UseOpsPaymentsAnalyticsParams {
  selectedAnalyticsMonth?: number | null;
  selectedAnalyticsYear?: number | null;
  selectedSalesperson?: string | null;
  enabled?: boolean;
  onLoadComplete?: () => void;
}

export const useOpsPaymentsAnalytics = ({
  selectedAnalyticsMonth = null,
  selectedAnalyticsYear = null,
  selectedSalesperson = null,
  enabled = true,
  onLoadComplete
}: UseOpsPaymentsAnalyticsParams = {}) => {
  const [opsPaymentsAnalytics, setOpsPaymentsAnalytics] = useState<OpsPaymentsAnalytics>({
    totalApprovedAmount: 0,
    totalPendingAmount: 0,
    totalRejectedAmount: 0,
    approvedCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    totalCount: 0
  });

  const [isLoading, setIsLoading] = useState(true);

  // Use ref to store the callback to avoid dependency issues
  const onLoadCompleteRef = useRef(onLoadComplete);
  onLoadCompleteRef.current = onLoadComplete;

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const opsPaymentsCollection = collection(db, 'ops_payments');

    const unsubscribe = onSnapshot(opsPaymentsCollection, (snapshot) => {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      const targetMonth = selectedAnalyticsMonth !== null ? selectedAnalyticsMonth : currentMonth;
      const targetYear = selectedAnalyticsYear !== null ? selectedAnalyticsYear : currentYear;

      const startOfMonth = new Date(targetYear, targetMonth, 1);
      const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

      const analytics: OpsPaymentsAnalytics = {
        totalApprovedAmount: 0,
        totalPendingAmount: 0,
        totalRejectedAmount: 0,
        approvedCount: 0,
        pendingCount: 0,
        rejectedCount: 0,
        totalCount: 0
      };

      snapshot.forEach((doc) => {
        const payment = doc.data();
        const amount = parseFloat(payment.amount) || 0;

        // Apply date filter
        if (payment.timestamp) {
          const paymentDate = new Date(payment.timestamp);
          if (paymentDate < startOfMonth || paymentDate > endOfMonth) {
            return;
          }
        }

        // Apply salesperson filter
        if (selectedSalesperson && payment.submittedBy !== selectedSalesperson) {
          return;
        }

        analytics.totalCount++;

        switch (payment.status) {
          case 'approved':
            analytics.totalApprovedAmount += amount;
            analytics.approvedCount++;
            break;
          case 'pending':
            analytics.totalPendingAmount += amount;
            analytics.pendingCount++;
            break;
          case 'rejected':
            analytics.totalRejectedAmount += amount;
            analytics.rejectedCount++;
            break;
        }
      });

      setOpsPaymentsAnalytics(analytics);
      setIsLoading(false);
      onLoadCompleteRef.current?.();

    }, (error) => {
      console.error("Error listening to ops_payments:", error);
      setIsLoading(false);
      onLoadCompleteRef.current?.();
    });

    return () => unsubscribe();
  }, [enabled, selectedAnalyticsMonth, selectedAnalyticsYear, selectedSalesperson]);

  return {
    opsPaymentsAnalytics,
    isLoading
  };
};