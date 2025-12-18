import { useState, useEffect, useRef } from 'react';
import { SalesAnalytics, Salesperson, IndividualSalesData } from '../types';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/firebase';

interface UseSalesAnalyticsParams {
  selectedAnalyticsMonth: number | null;
  selectedAnalyticsYear: number | null;
  selectedSalesperson: string | null;
  enabled?: boolean;
  onLoadComplete?: () => void;
}

export const useSalesAnalytics = ({
  selectedAnalyticsMonth,
  selectedAnalyticsYear,
  selectedSalesperson,
  enabled = true,
  onLoadComplete
}: UseSalesAnalyticsParams) => {
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics>({
    totalTargetAmount: 0,
    totalCollectedAmount: 0,
    monthlyRevenue: [0, 0, 0, 0, 0, 0],
    conversionRate: 0,
    avgDealSize: 0
  });

  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [individualSalesData, setIndividualSalesData] = useState<IndividualSalesData>(null);
  const [allSalesTargets, setAllSalesTargets] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Use ref to store the callback to avoid dependency issues
  const onLoadCompleteRef = useRef(onLoadComplete);
  onLoadCompleteRef.current = onLoadComplete;

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedAnalyticsMonth !== null) params.append('month', selectedAnalyticsMonth.toString());
        if (selectedAnalyticsYear !== null) params.append('year', selectedAnalyticsYear.toString());
        if (selectedSalesperson) params.append('salesperson', selectedSalesperson);

        const response = await fetch(`/api/dashboard/superadmin/sales?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch sales analytics');

        const data = await response.json();

        setSalesAnalytics(data.salesAnalytics);
        setSalespeople(data.salespeople);
        setIndividualSalesData(data.individualSalesData);
        setAllSalesTargets(data.allSalesTargets || {});

      } catch (error) {
        console.error("Error fetching sales analytics from API:", error);
      } finally {
        setIsLoading(false);
        onLoadCompleteRef.current?.();
      }
    };

    fetchData();

    // Real-time listener for Sales Revenue (payments collection)
    const startOfMonth = new Date(selectedAnalyticsYear || new Date().getFullYear(), selectedAnalyticsMonth || new Date().getMonth(), 1);
    const endOfMonth = new Date(selectedAnalyticsYear || new Date().getFullYear(), (selectedAnalyticsMonth || new Date().getMonth()) + 1, 0, 23, 59, 59, 999);

    const paymentsRef = collection(db, 'payments');
    let q = query(
      paymentsRef,
      where('status', '==', 'approved'),
      where('timestamp', '>=', Timestamp.fromDate(startOfMonth)),
      where('timestamp', '<=', Timestamp.fromDate(endOfMonth))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let totalCollected = 0;
      const salespersonTargets: Record<string, number> = {};

      snapshot.forEach((doc) => {
        const payment = doc.data();
        const amount = parseFloat(payment.amount) || 0;

        // Filter by salesperson if selected
        if (selectedSalesperson) {
          if (payment.salespersonName === selectedSalesperson) {
            totalCollected += amount;
          }
        } else {
          totalCollected += amount;
        }

        // Track per-salesperson collected amount for individualSalesData update
        if (payment.salespersonId) {
          salespersonTargets[payment.salespersonId] = (salespersonTargets[payment.salespersonId] || 0) + amount;
        }
      });

      setSalesAnalytics((prev: SalesAnalytics) => ({
        ...prev,
        totalCollectedAmount: totalCollected
      }));

      if (selectedSalesperson) {
        setIndividualSalesData((prev: IndividualSalesData) => {
          if (!prev) return prev;
          return {
            ...prev,
            collectedAmount: totalCollected
          };
        });
      }
    }, (error) => {
      console.error("Error listening to payments:", error);
    });

    return () => unsubscribe();
  }, [selectedAnalyticsMonth, selectedAnalyticsYear, selectedSalesperson, enabled]);

  return {
    salesAnalytics,
    salespeople,
    individualSalesData,
    allSalesTargets,
    isLoading
  };
};