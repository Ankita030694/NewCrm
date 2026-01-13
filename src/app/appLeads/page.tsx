'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppLead } from './types';
import AppLeadsTable from './components/AppLeadsTable';
import OverlordSidebar from "@/components/navigation/OverlordSidebar";
import AdminSidebar from "@/components/navigation/AdminSidebar";
import { FiSearch, FiDownload } from 'react-icons/fi';

export default function AppLeadsPage() {
  const { userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const [leads, setLeads] = useState<AppLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [lastCreatedAt, setLastCreatedAt] = useState<number | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');

  // Export to CSV function
  const exportToCSV = async () => {
    try {
      setExporting(true);
      setExportProgress('Starting...');
      
      let allLeads: any[] = [];
      let hasMore = true;
      let lastCreatedAtVal = null;
      let lastIdVal = null;
      const CHUNK_SIZE = 1000;

      // For search, we can't paginate efficiently with current backend implementation,
      // so we'll just try to fetch a reasonable max amount to avoid timeouts.
      // If no search, we paginate until done.
      const isSearch = !!searchQuery;
      const effectiveLimit = isSearch ? '5000' : String(CHUNK_SIZE);

      while (hasMore) {
        setExportProgress(`Fetched ${allLeads.length} records...`);
        const params = new URLSearchParams({ limit: effectiveLimit });
        
        if (searchQuery) {
          params.append('search', searchQuery);
        } else if (lastCreatedAtVal && lastIdVal) {
           params.append('lastCreatedAt', lastCreatedAtVal);
           params.append('lastId', lastIdVal);
        }

        const response = await fetch(`/api/app-leads?${params.toString()}`, { cache: 'no-store' });
        
        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }
        
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        const newLeads = data.leads;
        allLeads = [...allLeads, ...newLeads];
        
        if (newLeads.length > 0) {
            const lastLead = newLeads[newLeads.length - 1];
            lastCreatedAtVal = lastLead.created_at;
            lastIdVal = lastLead.id;
        }

        // If it's search, we stop after one batch because backend doesn't support search pagination yet
        if (isSearch || !data.hasMore || newLeads.length === 0) {
            hasMore = false;
        }
      }

      setExportProgress('Generating CSV...');

      const csvData = allLeads.map((lead: any) => ({
        "ID": lead.id || "",
        "Created At": lead.created_at ? new Date(lead.created_at).toLocaleString() : "",
        "Name": lead.name || "",
        "Phone": lead.phone || "",
        "Email": lead.email || "",
        "State": lead.state || "",
        "Source": lead.source || "",
        "Query": lead.query || "",
      }));

      if (csvData.length === 0) {
        alert("No data to export");
        return;
      }

      const headers = Object.keys(csvData[0]).join(",");
      const rows = csvData.map((obj: any) =>
        Object.values(obj)
          .map((value: any) => (typeof value === "string" ? `"${value.replace(/"/g, '""')}"` : value))
          .join(",")
      );

      const csv = [headers, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("hidden", "");
      a.setAttribute("href", url);
      a.setAttribute("download", `app-leads-export-${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setExportProgress('');

    } catch (err) {
      console.error('Failed to export leads:', err);
      alert('Failed to export leads. Please try again.');
    } finally {
      setExporting(false);
      setExportProgress('');
    }
  };

  const fetchLeads = useCallback(async (isLoadMore = false, query = '') => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ limit: '50' });
      
      if (query) {
        params.append('search', query);
      } else if (isLoadMore && lastCreatedAt && lastId) {
        params.append('lastCreatedAt', lastCreatedAt.toString());
        params.append('lastId', lastId);
      }

      const response = await fetch(`/api/app-leads?${params.toString()}`, { cache: 'no-store' });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setTotal(data.total);
      
      if (isLoadMore) {
        setLeads(prev => [...prev, ...data.leads]);
      } else {
        setLeads(data.leads);
      }

      setHasMore(data.hasMore);

      if (data.leads.length > 0) {
        const lastLead = data.leads[data.leads.length - 1];
        setLastCreatedAt(lastLead.created_at);
        setLastId(lastLead.id);
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [lastCreatedAt, lastId]);

  useEffect(() => {
    if (!authLoading && userRole !== 'admin' && userRole !== 'overlord') {
      router.push('/login');
    }
  }, [userRole, authLoading, router]);

  useEffect(() => {
    // Initial load
    fetchLeads(false, searchQuery);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Reset pagination state on new search
    setLastCreatedAt(null);
    setLastId(null);
    fetchLeads(false, searchQuery);
  };

  const handleLoadMore = () => {
    fetchLeads(true, searchQuery);
  };

  if (authLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  const content = (
      <div className="flex flex-col h-full">
        <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">App Leads</h1>
                <div className="flex items-center space-x-3">
                  <div className="bg-[#D2A02A] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
                  Total Leads: {total.toLocaleString()}
                  </div>
                  <button
                    onClick={exportToCSV}
                    disabled={exporting}
                    className={`flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D2A02A] ${
                      exporting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <FiDownload className={`mr-2 h-4 w-4 ${exporting ? 'animate-bounce' : ''}`} />
                    {exporting ? (exportProgress || 'Exporting...') : 'Export CSV'}
                  </button>
                </div>
            </div>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#D2A02A] focus:border-[#D2A02A] sm:text-sm"
                  placeholder="Search by name or phone number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
            </form>
        </header>
        
        <main className="flex-1 p-6">
          <div className="space-y-6">
             {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
             )}
             
             <AppLeadsTable 
                leads={leads} 
                hasMore={hasMore} 
                loading={loading} 
                loadMore={handleLoadMore} 
             />
          </div>
        </main>
      </div>
  );

  if (userRole === 'admin') {
    return (
      <div className="flex h-screen bg-gray-100">
        <AdminSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
             {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <OverlordSidebar>
      {content}
    </OverlordSidebar>
  );
}
