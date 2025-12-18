import React, { useMemo } from 'react';
import { Salesperson, SalesTargetData } from '../types';

interface SalespersonPerformanceTableProps {
  salespeople: Salesperson[];
  allSalesTargets: Record<string, SalesTargetData>;
  isLoading?: boolean;
  selectedAnalyticsMonth?: number | null;
  selectedAnalyticsYear?: number | null;
}

export const SalespersonPerformanceTable: React.FC<SalespersonPerformanceTableProps> = ({
  salespeople,
  allSalesTargets,
  isLoading = false,
  selectedAnalyticsMonth = null,
  selectedAnalyticsYear = null
}) => {
  
  const performanceData = useMemo(() => {
    return salespeople.map(person => {
      const targetData = allSalesTargets[person.id];
      
      const hasData = !!targetData;
      const convertedLeads = hasData ? targetData.convertedLeads : "N/A";
      const interestedLeads = "N/A";
      const targetAmount = hasData ? targetData.amountCollectedTarget : 0;
      const collectedAmount = hasData ? targetData.amountCollected : 0;
      const pendingAmount = Math.max(0, targetAmount - collectedAmount);
      
      const conversionRate = (hasData && typeof convertedLeads === 'number')
        ? Math.round((convertedLeads / (convertedLeads + 0)) * 100) // Fallback was interested, now 0
        : 0;
        
      const targetAchievement = targetAmount > 0 
        ? Math.round((collectedAmount / targetAmount) * 100) 
        : 0;

      return {
        name: person.name,
        convertedLeads,
        interestedLeads,
        targetAmount,
        collectedAmount,
        pendingAmount,
        conversionRate,
        targetAchievement,
        hasData
      };
    }).sort((a, b) => b.targetAchievement - a.targetAchievement);
  }, [salespeople, allSalesTargets]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
        <div className="text-blue-600 dark:text-blue-200">Loading salesperson data...</div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-blue-600 dark:text-blue-200 font-medium text-sm">Salesperson Performance</h4>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
              {(() => {
                const now = new Date();
                const targetMonth = selectedAnalyticsMonth !== null ? selectedAnalyticsMonth : now.getMonth();
                const targetYear = selectedAnalyticsYear !== null ? selectedAnalyticsYear : now.getFullYear();
                const monthNames = [
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ];
                return `${monthNames[targetMonth]} ${targetYear}`;
              })()}
            </p>
          </div>
        </div>
      </div>
      
      <div className="max-h-64 overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800/80 transition-colors">
            <tr className="bg-gray-100 dark:bg-gradient-to-r dark:from-blue-900/80 dark:to-purple-900/80">
              <th className="p-2 text-left font-semibold text-gray-700 dark:text-blue-100 text-xs">Salesperson</th>
              <th className="p-2 text-center font-semibold text-gray-700 dark:text-blue-100 text-xs">Converted (Month)</th>
              <th className="p-2 text-center font-semibold text-gray-700 dark:text-blue-100 text-xs">Interested (Month)</th>
              <th className="p-2 text-center font-semibold text-gray-700 dark:text-blue-100 text-xs">Target</th>
              <th className="p-2 text-center font-semibold text-gray-700 dark:text-blue-100 text-xs">Collected</th>
              <th className="p-2 text-center font-semibold text-gray-700 dark:text-blue-100 text-xs">Pending</th>
            </tr>
          </thead>
          <tbody>
            {performanceData.map((person, index) => (
              <tr 
                key={person.name} 
                className={`hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors ${
                  index % 2 === 0 ? 'bg-white dark:bg-gray-800/40' : 'bg-gray-50 dark:bg-gray-800/60'
                }`}
              >
                <td className="p-2 border-t border-gray-200 dark:border-gray-700 font-medium text-gray-800 dark:text-gray-100 text-xs">
                  {person.name}
                </td>
                <td className="p-2 text-center border-t border-gray-200 dark:border-gray-700 text-green-600 dark:text-green-300 text-xs font-semibold">
                  {person.convertedLeads}
                </td>
                <td className="p-2 text-center border-t border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-300 text-xs">
                  {person.interestedLeads}
                </td>
                <td className="p-2 text-center border-t border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 text-xs">
                  {formatCurrency(person.targetAmount)}
                </td>
                <td className="p-2 text-center border-t border-gray-200 dark:border-gray-700 text-green-600 dark:text-green-300 text-xs font-semibold">
                  {formatCurrency(person.collectedAmount)}
                </td>
                <td className="p-2 text-center border-t border-gray-200 dark:border-gray-700 text-orange-600 dark:text-orange-300 text-xs">
                  {formatCurrency(person.pendingAmount)}
                </td>
              
              </tr>
            ))}
            
            {performanceData.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                  No salesperson data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Summary row */}
      {performanceData.length > 0 && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-200 dark:bg-gradient-to-r dark:from-blue-900/90 dark:to-purple-900/90 transition-colors">
          <div className="grid grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-blue-600 dark:text-blue-200">Total Converted (Month): </span>
              <span className="text-gray-900 dark:text-white font-semibold">
                {performanceData.reduce((sum, p) => sum + (typeof p.convertedLeads === 'number' ? p.convertedLeads : 0), 0)}
              </span>
            </div>
            <div>
              <span className="text-blue-600 dark:text-blue-200">Total Target: </span>
              <span className="text-gray-900 dark:text-white font-semibold">
                {formatCurrency(performanceData.reduce((sum, p) => sum + p.targetAmount, 0))}
              </span>
            </div>
            <div>
              <span className="text-blue-600 dark:text-blue-200">Total Collected: </span>
              <span className="text-gray-900 dark:text-white font-semibold">
                {formatCurrency(performanceData.reduce((sum, p) => sum + p.collectedAmount, 0))}
              </span>
            </div>
            <div>
              <span className="text-blue-600 dark:text-blue-200">Total Interested (Month): </span>
              <span className="text-gray-900 dark:text-white font-semibold">
                {performanceData.reduce((sum, p) => sum + (typeof p.interestedLeads === 'number' ? p.interestedLeads : 0), 0)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 