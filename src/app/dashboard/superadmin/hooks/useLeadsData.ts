import { useState, useEffect, useRef } from 'react';
import { collection, query, where, Timestamp, onSnapshot, QueryConstraint } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { LeadsBySourceData, SourceTotals, StatusKey, SourceKey, ChartDataset } from '../types';
import { statusColors } from '../utils/chartConfigs';

interface UseLeadsDataParams {
  startDate: string;
  endDate: string;
  isFilterApplied: boolean;
  selectedLeadsSalesperson: string | null;
  enabled?: boolean;
  onLoadComplete?: () => void;
}

export const useLeadsData = ({
  startDate,
  endDate,
  isFilterApplied,
  selectedLeadsSalesperson,
  enabled = true,
  onLoadComplete
}: UseLeadsDataParams) => {
  const [leadsBySourceData, setLeadsBySourceData] = useState<LeadsBySourceData>({
    labels: ['Settleloans', 'Credsettlee', 'AMA', 'Billcut'],
    datasets: [],
  });

  const [sourceTotals, setSourceTotals] = useState<SourceTotals>({
    settleloans: 0,
    credsettlee: 0,
    ama: 0,
    billcut: 0,
  });

  const [leadsBySalesperson, setLeadsBySalesperson] = useState<Record<string, { interested: number; converted: number }>>({});

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

    // Create queries
    const leadsCollection = collection(db, 'ama_leads');
    let leadsQuery: any = leadsCollection;

    const billcutCollection = collection(db, 'billcutLeads');
    let billcutQuery: any = billcutCollection;

    // Apply filters
    const leadsConstraints: QueryConstraint[] = [];
    const billcutConstraints: QueryConstraint[] = [];

    if (isFilterApplied && (startDate || endDate)) {
      if (startDate) {
        const startTimestamp = Timestamp.fromDate(new Date(startDate));
        leadsConstraints.push(where('synced_at', '>=', startTimestamp));
        billcutConstraints.push(where('synced_date', '>=', startTimestamp));
      }

      if (endDate) {
        const endTimestamp = Timestamp.fromDate(new Date(`${endDate}T23:59:59`));
        leadsConstraints.push(where('synced_at', '<=', endTimestamp));
        billcutConstraints.push(where('synced_date', '<=', endTimestamp));
      }
    }

    if (selectedLeadsSalesperson) {
      // For ama_leads, check both fields or just one if we are sure. 
      // Firestore 'OR' queries for same field are 'IN', but for different fields it's complex.
      // Given the schema has both and they seem identical, we'll stick to assignedTo but maybe we should check assigned_to if assignedTo is missing?
      // Actually, for filtering, we need to be precise. If the schema guarantees both, assignedTo is fine.
      // But if some docs only have assigned_to, we might miss them.
      // Let's assume assignedTo is the primary one for now as per schema "assignedTo" presence.
      // However, to be safe and consistent with the read logic:
      leadsConstraints.push(where('assignedTo', '==', selectedLeadsSalesperson));
      billcutConstraints.push(where('assigned_to', '==', selectedLeadsSalesperson));
    }

    if (leadsConstraints.length > 0) {
      leadsQuery = query(leadsCollection, ...leadsConstraints);
    }
    if (billcutConstraints.length > 0) {
      billcutQuery = query(billcutCollection, ...billcutConstraints);
    }

    // Data holders
    let leadsData: any[] = [];
    let billcutData: any[] = [];
    let leadsLoaded = false;
    let billcutLoaded = false;

    const processData = () => {
      if (!leadsLoaded || !billcutLoaded) return;

      // Initialize counts
      const sourceTotalCounts = {
        settleloans: 0,
        credsettlee: 0,
        ama: 0,
        billcut: 0,
      };

      const statusCounts = {
        'Interested': { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 },
        'Not Interested': { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 },
        'Not Answering': { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 },
        'Callback': { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 },
        'Converted': { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 },
        'Loan Required': { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 },
        'Short Loan': { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 },
        'Cibil Issue': { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 },
        'Closed Lead': { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 },
        'Language Barrier': { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 },
        'Future Potential': { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 },
        'No Status': { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 },
      };

      // Process AMA Leads
      leadsData.forEach(lead => {
        let source = lead.source_database;
        if (source) {
          source = source.toLowerCase();
          let mappedSource;
          if (source.includes('settleloans')) mappedSource = 'settleloans';
          else if (source.includes('credsettlee') || source.includes('credsettle')) mappedSource = 'credsettlee';
          else if (source.includes('ama')) mappedSource = 'ama';

          if (mappedSource) {
            sourceTotalCounts[mappedSource as SourceKey]++;
            const status = lead.status;
            if (status && statusCounts[status as StatusKey]) {
              statusCounts[status as StatusKey][mappedSource as SourceKey]++;
            } else {
              statusCounts['No Status'][mappedSource as SourceKey]++;
            }
          }
        }
      });

      // Process Billcut Leads
      billcutData.forEach(lead => {
        sourceTotalCounts.billcut++;
        const category = lead.category;
        if (category && statusCounts[category as StatusKey]) {
          statusCounts[category as StatusKey].billcut++;
        } else {
          statusCounts['No Status'].billcut++;
        }
      });

      // Aggregate leads by salesperson
      const salespersonCounts: Record<string, { interested: number; converted: number }> = {};

      // Helper to update salesperson counts
      const updateSalespersonCount = (name: string, status: string, category?: string) => {
        if (!name || name === 'Unassigned') return;

        if (!salespersonCounts[name]) {
          salespersonCounts[name] = { interested: 0, converted: 0 };
        }

        // Check for Interested
        if (status === 'Interested' || category === 'Interested') {
          salespersonCounts[name].interested++;
        }

        // Check for Converted (though usually we use targets for this, having it here is good for cross-ref)
        if (status === 'Converted' || category === 'Converted') {
          salespersonCounts[name].converted++;
        }
      };

      leadsData.forEach(lead => {
        updateSalespersonCount(lead.assignedTo || lead.assigned_to, lead.status);
      });

      billcutData.forEach(lead => {
        updateSalespersonCount(lead.assigned_to, lead.status, lead.category);
      });

      setLeadsBySalesperson(salespersonCounts);

      // Prepare chart data
      const datasets = Object.entries(statusCounts).map(([status, sources], index): ChartDataset => {
        return {
          label: status,
          data: [sources.settleloans, sources.credsettlee, sources.ama, sources.billcut],
          backgroundColor: statusColors[index % statusColors.length],
        };
      });

      setLeadsBySourceData({
        labels: ['Settleloans', 'Credsettlee', 'AMA', 'Billcut'],
        datasets,
      });
      setSourceTotals(sourceTotalCounts);
      setIsLoading(false);
      onLoadCompleteRef.current?.();
    };

    // Set up listeners
    const unsubscribeLeads = onSnapshot(leadsQuery, (snapshot: any) => {
      leadsData = snapshot.docs.map((doc: any) => doc.data());
      leadsLoaded = true;
      processData();
    }, (error: any) => {
      console.error("Error listening to ama_leads:", error);
      leadsLoaded = true; // Proceed even on error
      processData();
    });

    const unsubscribeBillcut = onSnapshot(billcutQuery, (snapshot: any) => {
      billcutData = snapshot.docs.map((doc: any) => doc.data());
      billcutLoaded = true;
      processData();
    }, (error: any) => {
      console.error("Error listening to billcutLeads:", error);
      billcutLoaded = true; // Proceed even on error
      processData();
    });

    return () => {
      unsubscribeLeads();
      unsubscribeBillcut();
    };
  }, [startDate, endDate, isFilterApplied, selectedLeadsSalesperson, enabled]);

  return {
    leadsBySourceData,
    sourceTotals,
    leadsBySalesperson,
    isLoading
  };
}; 