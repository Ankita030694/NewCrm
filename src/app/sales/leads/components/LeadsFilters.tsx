import { FaFilter, FaUserTie } from 'react-icons/fa';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { debounce } from 'lodash';

type LeadsFiltersProps = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sourceFilter: string;
  setSourceFilter: (source: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  salesPersonFilter: string;
  setSalesPersonFilter: (salesperson: string) => void;
  statusOptions: string[];
  teamMembers: any[];
  userRole: string;
  filteredLeads: any[];
  leads: any[];
  totalLeadsCount: number;
  convertedFilter: boolean | null;
  setConvertedFilter: (converted: boolean | null) => void;
  fromDate: string;
  setFromDate: (date: string) => void;
  toDate: string;
  setToDate: (date: string) => void;
};

const LeadsFilters = ({
  searchQuery,
  setSearchQuery,
  sourceFilter,
  setSourceFilter,
  statusFilter,
  setStatusFilter,
  salesPersonFilter,
  setSalesPersonFilter,
  statusOptions,
  teamMembers,
  userRole,
  filteredLeads,
  leads,
  totalLeadsCount,
  convertedFilter,
  setConvertedFilter,
  fromDate,
  setFromDate,
  toDate,
  setToDate
}: LeadsFiltersProps) => {
  const [salesUsers, setSalesUsers] = useState<{id: string, name: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // New search implementation
  const [searchInput, setSearchInput] = useState(searchQuery);
  
  // Create a more efficient debounced search function
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchQuery(value);
    }, 300),
    []
  );
  
  // Update local search state when parent state changes
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);
  
  // Handle search input changes
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedSearch(value);
  };
  
  // Clear search function
  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  // Debug the search functionality
  useEffect(() => {
  }, [searchQuery]);

  // Fetch sales users
  useEffect(() => {
    const fetchSalesUsers = async () => {
      try {
        setIsLoading(true);
        const salesQuery = query(collection(db, 'users'), where('role', '==', 'sales'));
        const querySnapshot = await getDocs(salesQuery);
        
        const users = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const fullName = data.firstName && data.lastName 
            ? `${data.firstName} ${data.lastName}`
            : data.firstName || data.lastName || 'Unknown';
          
          return {
            id: doc.id,
            name: fullName,
          };
        });
        
        setSalesUsers(users);
      } catch (error) {
        console.error('Error fetching sales users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalesUsers();
  }, []);

  // Format date for input max attribute
  const today = useMemo(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  }, []);

  // Clear date filters
  const clearDateFilters = () => {
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="space-y-2s">
      {/* Search bar implementation */}
      <div className="">
        <div className="relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-10 py-2 border border-gray-700 bg-gray-800 text-gray-200 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-xs"
            placeholder="Search by name, email, or phone number..."
            value={searchInput}
            onChange={handleSearchInputChange}
          />
          {searchInput && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                onClick={clearSearch}
                className="text-gray-400 hover:text-gray-300 focus:outline-none"
                aria-label="Clear search"
                type="button"
              >
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Filters section with improved layout */}
      <div className="bg-gray-850 rounded-lg p-2">
        <div className="flex items-center mb-3">
          <FaFilter className="text-gray-400 mr-2" />
          <span className="text-sm font-medium text-gray-300">Filters</span>
          
          {/* Results counter moved to the right */}
          <div className="ml-auto">
            <p className="text-sm text-gray-400">
              {searchQuery ? (
                <>
                  Found <span className="text-blue-400 font-medium">{filteredLeads.length}</span> of <span className="text-blue-400 font-medium">{totalLeadsCount}</span> leads
                </>
              ) : (
                <>
                  Lead Count:  <span className="text-blue-400 font-medium">{totalLeadsCount}</span>
                </>
              )}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Source Filter */}
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">Source</label>
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-700 bg-gray-800 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
            >
              <option value="all">All Sources</option>
              <option value="ama">AMA</option>
              <option value="credsettlee">CredSettle</option>
              <option value="settleloans">SettleLoans</option>
            </select>
          </div>
          
          {/* Status Filter */}
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-700 bg-gray-800 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
            >
              <option value="all">All Status</option>
              <option value="No Status">No Status</option>
              {statusOptions
                .filter(status => status !== 'No Status')
                .map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
            </select>
          </div>
          
          {/* Salesperson Filter */}
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">Salesperson</label>
            <div className="relative">
              <select
                value={salesPersonFilter}
                onChange={e => setSalesPersonFilter(e.target.value)}
                className={`block w-full pl-3 pr-10 py-2 text-sm border border-gray-700 bg-gray-800 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md ${userRole !== 'admin' && userRole !== 'overlord' ? 'opacity-70 cursor-not-allowed' : ''}`}
                disabled={userRole !== 'admin' && userRole !== 'overlord'}
              >
                {(userRole === 'admin' || userRole === 'overlord') && <option value="all">All Salespersons</option>}
                {(userRole === 'admin' || userRole === 'overlord') && <option value="">Unassigned</option>}
                {isLoading ? (
                  <option value="" disabled>Loading...</option>
                ) : (
                  salesUsers.map(user => (
                    <option key={user.id} value={user.name}>{user.name}</option>
                  ))
                )}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <FaUserTie className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
          
          {/* Date Range Filters */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <div className="flex space-x-4">
              <div className="flex-1 space-y-1">
                <label className="block text-xs text-gray-400">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  max={toDate || today}
                  className="block w-full pl-3 pr-3 py-2 text-sm border border-gray-700 bg-gray-800 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                />
              </div>
              
              <div className="flex-1 space-y-1">
                <label className="block text-xs text-gray-400">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  min={fromDate}
                  max={today}
                  className="block w-full pl-3 pr-3 py-2 text-sm border border-gray-700 bg-gray-800 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                />
              </div>
            </div>
            
            <div className="flex items-end">
              {(fromDate || toDate) && (
                <button 
                  onClick={clearDateFilters}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  type="button"
                >
                  <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear date filters
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadsFilters;