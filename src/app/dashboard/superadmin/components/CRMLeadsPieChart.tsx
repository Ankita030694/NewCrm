import React from 'react';
import { Pie } from 'react-chartjs-2';
import { SourceTotals } from '../types';
import { getSourceTotalsPieOptions, sourceColors } from '../utils/chartConfigs';
import { useTheme } from '../context/ThemeContext';

interface CRMLeadsPieChartProps {
  sourceTotals: SourceTotals;
  isLoading: boolean;
}

export const CRMLeadsPieChart: React.FC<CRMLeadsPieChartProps> = ({
  sourceTotals,
  isLoading
}) => {
  const { theme } = useTheme();
  const options = getSourceTotalsPieOptions(theme);

  if (isLoading) {
    return (
      <div className="flex-1 flex justify-center items-center bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
        <div className="text-blue-600 dark:text-blue-200">Loading lead data...</div>
      </div>
    );
  }

  const sourceTotalsPieData = {
    labels: ['Settleloans', 'Credsettlee', 'AMA', 'Billcut'],
    datasets: [
      {
        data: [sourceTotals.settleloans, sourceTotals.credsettlee, sourceTotals.ama, sourceTotals.billcut],
        backgroundColor: [
          sourceColors.settleloans,  // Teal for Settleloans
          sourceColors.credsettlee,  // Indigo for Credsettlee
          sourceColors.ama,          // Orange for AMA
          sourceColors.billcut,      // Pink for Billcut
        ],
        borderColor: [
          'rgba(52, 191, 163, 1)',
          'rgba(79, 70, 229, 1)',
          'rgba(249, 115, 22, 1)',
          'rgba(236, 72, 153, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const totalLeads = sourceTotals.settleloans + sourceTotals.credsettlee + sourceTotals.ama + sourceTotals.billcut;

  const getPercentage = (value: number) => {
    return totalLeads > 0 ? Math.round((value / totalLeads) * 100) : 0;
  };

  return (
    <>
      <div className="flex-1 flex items-center justify-center">
        <div className="h-48 w-full">
          <Pie data={sourceTotalsPieData} options={options} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2">
        <div className="bg-white dark:bg-gradient-to-br dark:from-teal-900/70 dark:to-teal-800/50 p-2 rounded-lg border border-teal-200 dark:border-teal-700/30 shadow-md flex justify-between items-center transition-colors">
          <div>
            <p className="text-teal-600 dark:text-teal-300 font-medium text-xs">Settleloans</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{sourceTotals.settleloans}</p>
          </div>
          <div className="text-teal-800 dark:text-white text-xs bg-teal-100 dark:bg-teal-800/60 rounded-md px-2 py-1 font-medium">
            {getPercentage(sourceTotals.settleloans)}%
          </div>
        </div>
        <div className="bg-white dark:bg-gradient-to-br dark:from-indigo-900/70 dark:to-indigo-800/50 p-2 rounded-lg border border-indigo-200 dark:border-indigo-700/30 shadow-md flex justify-between items-center transition-colors">
          <div>
            <p className="text-indigo-600 dark:text-indigo-300 font-medium text-xs">Credsettlee</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{sourceTotals.credsettlee}</p>
          </div>
          <div className="text-indigo-800 dark:text-white text-xs bg-indigo-100 dark:bg-indigo-800/60 rounded-md px-2 py-1 font-medium">
            {getPercentage(sourceTotals.credsettlee)}%
          </div>
        </div>
        <div className="bg-white dark:bg-gradient-to-br dark:from-orange-900/70 dark:to-orange-800/50 p-2 rounded-lg border border-orange-200 dark:border-orange-700/30 shadow-md flex justify-between items-center transition-colors">
          <div>
            <p className="text-orange-600 dark:text-orange-300 font-medium text-xs">AMA</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{sourceTotals.ama}</p>
          </div>
          <div className="text-orange-800 dark:text-white text-xs bg-orange-100 dark:bg-orange-800/60 rounded-md px-2 py-1 font-medium">
            {getPercentage(sourceTotals.ama)}%
          </div>
        </div>
        <div className="bg-white dark:bg-gradient-to-br dark:from-pink-900/70 dark:to-pink-800/50 p-2 rounded-lg border border-pink-200 dark:border-pink-700/30 shadow-md flex justify-between items-center transition-colors">
          <div>
            <p className="text-pink-600 dark:text-pink-300 font-medium text-xs">Billcut</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{sourceTotals.billcut}</p>
          </div>
          <div className="text-pink-800 dark:text-white text-xs bg-pink-100 dark:bg-pink-800/60 rounded-md px-2 py-1 font-medium">
            {getPercentage(sourceTotals.billcut)}%
          </div>
        </div>
        <div className="bg-gray-100 dark:bg-gradient-to-r dark:from-blue-900/70 dark:to-purple-900/70 p-2 rounded-lg border border-gray-300 dark:border-blue-700/30 shadow-md transition-colors">
          <p className="text-gray-700 dark:text-blue-200 font-medium text-xs">Total Leads</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{totalLeads}</p>
        </div>
      </div>
    </>
  );
}; 