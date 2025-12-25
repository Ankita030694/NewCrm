'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from 'next/link'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

// Import server action and types
import { getAdminDashboardData, getDashboardHistory, SalesUser, TargetData, HistoryData } from './actions'

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSales: 0,
    totalAdvocates: 0,
  })
  const [loading, setLoading] = useState(true)
  
  // Data state
  const [salesUsers, setSalesUsers] = useState<SalesUser[]>([])
  const [targetData, setTargetData] = useState<TargetData[]>([])
  const [historyData, setHistoryData] = useState<HistoryData[]>([])
  
  // Month/Year filter state
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const date = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[date.getMonth()];
  })
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear())

  // Fetch data function
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch main dashboard data and history in parallel
      const [data, history] = await Promise.all([
        getAdminDashboardData(selectedMonth, selectedYear),
        getDashboardHistory(selectedMonth, selectedYear)
      ]);
      
      setSalesUsers(data.salesUsers);
      setTargetData(data.targetData);
      setStats(data.stats);
      setHistoryData(history);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshAllData = () => {
    fetchData();
  };

  // Calculate totals from all target data
  const filteredData = useMemo(() => {
    const totalAmount = targetData.reduce((sum, target) => sum + (target.amountCollected || 0), 0);
    const totalTarget = targetData.reduce((sum, target) => sum + (target.amountCollectedTarget || 0), 0);
    const totalConverted = targetData.reduce((sum, target) => sum + (target.convertedLeads || 0), 0);
    const totalLeadsTarget = targetData.reduce((sum, target) => sum + (target.convertedLeadsTarget || 0), 0);

    return {
      amountCollected: totalAmount,
      amountTarget: totalTarget,
      convertedLeads: totalConverted,
      leadsTarget: totalLeadsTarget
    }
  }, [targetData]);

  // Helper function for Indian number formatting
  const formatIndianCurrency = (value: number) => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(0)}Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(0)}L`;
    } else if (value >= 1000) {
      return `₹${(value / 1000).toFixed(0)}k`;
    }
    return `₹${value}`;
  };

  if (loading) {
    return <div className="p-6">Loading dashboard data...</div>
  }

  // Calculate percentages
  const amountPercentage = Math.round((filteredData.amountCollected / filteredData.amountTarget) * 100) || 0
  const leadsPercentage = Math.round((filteredData.convertedLeads / filteredData.leadsTarget) * 100) || 0

  return (
    <div className="p-6 bg-gray-900 text-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        
        <div className="flex items-center gap-2">
          <button
            onClick={refreshAllData}
            className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded-md transition-colors"
            title="Refresh all data"
          >
            🔄 Refresh
          </button>
        </div>
      </div>
      
      {/* Sales Analytics Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
          Sales Analytics Dashboard
        </h2>
        
        {/* Month and Year Filter */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="monthSelect" className="block text-sm font-medium mb-2 text-gray-300">
              Select Month:
            </label>
            <select 
              id="monthSelect"
              className="bg-gray-800 border border-gray-700 text-gray-100 rounded-md px-3 py-2 w-full"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="yearSelect" className="block text-sm font-medium mb-2 text-gray-300">
              Select Year:
            </label>
            <select 
              id="yearSelect"
              className="bg-gray-800 border border-gray-700 text-gray-100 rounded-md px-3 py-2 w-full"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <div className="text-sm text-gray-400">
            <div className="text-lg font-semibold text-indigo-400">
              Showing data for: {selectedMonth} {selectedYear}
            </div>
          </div>
        </div>
        
        {/* Collection and Leads Targets Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl hover:shadow-indigo-500/10 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-gray-100">Collection Target</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-3 text-indigo-400">₹{filteredData.amountCollected.toLocaleString()} 
                <span className="text-gray-400 text-xl"> / ₹{filteredData.amountTarget.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2.5 mb-3">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${amountPercentage}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-400">{amountPercentage}% of target achieved</p>
              <p className="text-xs text-gray-500 mt-1">Based on approved payments</p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-gray-100">
                Converted Leads Target ({selectedMonth} {selectedYear})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-3 text-emerald-400">{filteredData.convertedLeads} 
                <span className="text-gray-400 text-xl"> / {filteredData.leadsTarget}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2.5 mb-3">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${leadsPercentage}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-400">{leadsPercentage}% of target achieved</p>
            </CardContent>
          </Card>
        </div>
        
        {/* History Chart */}
        <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-100">Collection Trends (All Time)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={historyData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="fullLabel" 
                    stroke="#9CA3AF" 
                    tick={{ fill: '#9CA3AF' }}
                  />
                  <YAxis 
                    stroke="#9CA3AF" 
                    tick={{ fill: '#9CA3AF' }}
                    tickFormatter={formatIndianCurrency}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                    itemStyle={{ color: '#F3F4F6' }}
                    formatter={(value: number) => [value.toLocaleString('en-IN', { maximumFractionDigits: 0, style: 'currency', currency: 'INR' }), '']}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="target" 
                    name="Collection Target" 
                    stroke="#818cf8" 
                    activeDot={{ r: 8 }} 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="collected" 
                    name="Collected Amount" 
                    stroke="#34d399" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sales Target Table */}
        <Card className="border-0 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl hover:shadow-purple-500/10 transition-all duration-300 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-100">Sales Team Targets & Collections ({selectedMonth} {selectedYear})</CardTitle>
            <p className="text-xs text-gray-500">Collected amounts based on approved payments</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Sales Person
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Target Amount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Collected Amount
                    </th>
                     <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Pending Amount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Converted Leads
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Achievement %
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {targetData.filter((target) => {
                    // Only show targets for active sales users
                    const isActiveUser = salesUsers.some(user => 
                      user.id === target.userId || 
                      user.fullName === target.userName ||
                      user.firstName === target.userName ||
                      user.email === target.userName ||
                      user.uid === target.userId
                    );
                    return isActiveUser;
                  }).map((target) => {
                    const percentage = Math.round((target.amountCollected || 0) / (target.amountCollectedTarget || 1) * 100);
                    return (
                      <tr key={target.id} className="hover:bg-gray-750 transition-colors duration-150">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">
                          {target.userName || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-300">
                          ₹{(target.amountCollectedTarget || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-300">
                          ₹{(target.amountCollected || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-300">
                          ₹{((target.amountCollectedTarget || 0) - (target.amountCollected || 0) || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-300">
                          {target.convertedLeads || 0}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          <span 
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              percentage >= 100 ? 'bg-emerald-900 text-emerald-200' : 
                              percentage >= 75 ? 'bg-indigo-900 text-indigo-200' :
                              percentage >= 50 ? 'bg-amber-900 text-amber-200' : 
                              'bg-rose-900 text-rose-200'
                            }`}
                          >
                            {percentage}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      

    </div>
  )
}

export default AdminDashboard
