import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { ClientAnalytics } from '../types';

interface UseClientAnalyticsParams {
  enabled?: boolean;
  onLoadComplete?: () => void;
}

export const useClientAnalytics = ({
  enabled = true,
  onLoadComplete
}: UseClientAnalyticsParams = {}) => {
  const [clientAnalytics, setClientAnalytics] = useState<ClientAnalytics>({
    totalClients: 0,
    statusDistribution: {
      Active: 0,
      Dropped: 0,
      'Not Responding': 0,
      'On Hold': 0,
      Inactive: 0
    },
    topAdvocates: [],
    loanTypeDistribution: {},
    sourceDistribution: {},
    cityDistribution: {},
    totalLoanAmount: 0,
    avgLoanAmount: 0,
    advocateStatusDistribution: {}
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
    const clientsCollection = collection(db, 'clients');

    const unsubscribe = onSnapshot(clientsCollection, (snapshot) => {
      const analytics = {
        totalClients: 0,
        statusDistribution: {
          Active: 0,
          Dropped: 0,
          'Not Responding': 0,
          'On Hold': 0,
          Inactive: 0
        },
        advocateCount: {} as Record<string, number>,
        loanTypeDistribution: {} as Record<string, number>,
        sourceDistribution: {} as Record<string, number>,
        cityDistribution: {} as Record<string, number>,
        totalLoanAmount: 0,
        loanCount: 0,
        advocateStatusDistribution: {} as Record<string, Record<string, number>>
      };

      snapshot.forEach((doc) => {
        const client = doc.data();
        analytics.totalClients++;

        // Status
        const status = client.adv_status || client.status || 'Inactive';
        if ((analytics.statusDistribution as any)[status] === undefined) {
          (analytics.statusDistribution as any)[status] = 0;
        }
        (analytics.statusDistribution as any)[status]++;

        // Advocate
        const advocate = client.alloc_adv || 'Unassigned';
        analytics.advocateCount[advocate] = (analytics.advocateCount[advocate] || 0) + 1;

        // Advocate Status Distribution
        if (!analytics.advocateStatusDistribution[advocate]) {
          analytics.advocateStatusDistribution[advocate] = {
            Active: 0,
            Dropped: 0,
            'Not Responding': 0,
            'On Hold': 0,
            Inactive: 0
          };
        }
        if (analytics.advocateStatusDistribution[advocate][status] !== undefined) {
          analytics.advocateStatusDistribution[advocate][status]++;
        } else {
          analytics.advocateStatusDistribution[advocate][status] = 1;
        }

        // Source
        const source = client.source || 'Unknown';
        analytics.sourceDistribution[source] = (analytics.sourceDistribution[source] || 0) + 1;

        // City
        const city = client.city || 'Unknown';
        analytics.cityDistribution[city] = (analytics.cityDistribution[city] || 0) + 1;

        // Loan Amount
        let totalClientLoanAmount = 0;
        if (client.creditCardDues) {
          const creditCardDues = typeof client.creditCardDues === 'string'
            ? parseFloat(client.creditCardDues.replace(/[^0-9.-]+/g, ''))
            : parseFloat(client.creditCardDues) || 0;
          if (!isNaN(creditCardDues) && creditCardDues > 0) {
            totalClientLoanAmount += creditCardDues;
          }
        }
        if (client.personalLoanDues) {
          const personalLoanDues = typeof client.personalLoanDues === 'string'
            ? parseFloat(client.personalLoanDues.replace(/[^0-9.-]+/g, ''))
            : parseFloat(client.personalLoanDues) || 0;
          if (!isNaN(personalLoanDues) && personalLoanDues > 0) {
            totalClientLoanAmount += personalLoanDues;
          }
        }

        if (totalClientLoanAmount > 0) {
          analytics.totalLoanAmount += totalClientLoanAmount;
          analytics.loanCount++;
        }

        // Loan Type
        if (client.banks && Array.isArray(client.banks) && client.banks.length > 0) {
          client.banks.forEach((bank: any) => {
            const loanType = bank.loanType || 'Unknown';
            analytics.loanTypeDistribution[loanType] = (analytics.loanTypeDistribution[loanType] || 0) + 1;
          });
        }
      });

      const avgLoanAmount = analytics.loanCount > 0
        ? Math.round(analytics.totalLoanAmount / analytics.loanCount)
        : 0;

      const advocateEntries = Object.entries(analytics.advocateCount);
      advocateEntries.sort((a, b) => b[1] - a[1]);
      const topAdvocates = advocateEntries.slice(0, 10).map(([name, clientCount]) => ({ name, clientCount }));

      setClientAnalytics({
        totalClients: analytics.totalClients,
        statusDistribution: analytics.statusDistribution,
        topAdvocates,
        loanTypeDistribution: analytics.loanTypeDistribution,
        sourceDistribution: analytics.sourceDistribution,
        cityDistribution: analytics.cityDistribution,
        totalLoanAmount: analytics.totalLoanAmount,
        avgLoanAmount,
        advocateStatusDistribution: analytics.advocateStatusDistribution
      });

      setIsLoading(false);
      onLoadCompleteRef.current?.();

    }, (error) => {
      console.error("Error listening to clients:", error);
      setIsLoading(false);
      onLoadCompleteRef.current?.();
    });

    return () => unsubscribe();
  }, [enabled]);

  return {
    clientAnalytics,
    isLoading
  };
};