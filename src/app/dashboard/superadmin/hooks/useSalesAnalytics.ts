import { useState, useEffect, useRef } from 'react';
import { SalesAnalytics, Salesperson, IndividualSalesData } from '../types';

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
  }, [selectedAnalyticsMonth, selectedAnalyticsYear, selectedSalesperson, enabled]);

  return {
    salesAnalytics,
    salespeople,
    individualSalesData,
    allSalesTargets,
    isLoading
  };
};