import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClientAdvocateWeeklyAnalytics } from '../hooks/useClientAdvocateWeeklyAnalytics';
import { Check, ChevronDown, Filter } from 'lucide-react';

interface ClientAdvocateWeeklyAnalyticsProps {
    enabled?: boolean;
}

export const ClientAdvocateWeeklyAnalyticsComponent: React.FC<ClientAdvocateWeeklyAnalyticsProps> = ({
    enabled = true
}) => {
    const { data, isLoading } = useClientAdvocateWeeklyAnalytics(enabled);
    const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const now = new Date();
    const currentMonthLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

    // Extract all available months from the data
    const allAvailableMonths = useMemo(() => {
        const monthsSet = new Set<string>();
        // Always include current month
        monthsSet.add(currentMonthLabel);
        
        data.forEach(item => {
            if (item.history) {
                Object.keys(item.history).forEach(month => monthsSet.add(month));
            }
        });
        
        // Convert to array and sort chronologically (newest first for the menu)
        return Array.from(monthsSet).sort((a, b) => {
            const [mA, yA] = a.split(' ');
            const [mB, yB] = b.split(' ');
            if (yA !== yB) return parseInt(yB) - parseInt(yA);
            return monthNames.indexOf(mB) - monthNames.indexOf(mA);
        });
    }, [data, currentMonthLabel, monthNames]);

    // Set default selection to current month on first load
    useEffect(() => {
        if (selectedMonths.length === 0 && allAvailableMonths.length > 0) {
            setSelectedMonths([currentMonthLabel]);
        }
    }, [allAvailableMonths, currentMonthLabel, selectedMonths.length]);

    // Displayed months in table (sorted oldest first for trend comparison)
    const displayedMonths = useMemo(() => {
        return [...selectedMonths].sort((a, b) => {
            const [mA, yA] = a.split(' ');
            const [mB, yB] = b.split(' ');
            if (yA !== yB) return parseInt(yA) - parseInt(yB);
            return monthNames.indexOf(mA) - monthNames.indexOf(mB);
        });
    }, [selectedMonths, monthNames]);

    // Sort data by total count across selected months (Descending)
    const sortedData = useMemo(() => {
        if (!data || data.length === 0) return [];
        if (selectedMonths.length === 0) return data;

        return [...data].sort((a, b) => {
            const totalA = selectedMonths.reduce((sum, month) => sum + (a.history[month]?.total || 0), 0);
            const totalB = selectedMonths.reduce((sum, month) => sum + (b.history[month]?.total || 0), 0);
            return totalB - totalA;
        });
    }, [data, selectedMonths]);

    const toggleMonth = (month: string) => {
        setSelectedMonths(prev => 
            prev.includes(month) 
                ? prev.filter(m => m !== month) 
                : [...prev, month]
        );
    };

    if (isLoading) {
        return (
            <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse flex items-center justify-center">
                <div className="text-gray-400 text-sm">Loading Client & Advocate Analytics...</div>
            </div>
        );
    }

    return (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg mt-4 overflow-hidden">
            <CardHeader className="pb-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <CardTitle className="text-gray-900 dark:text-white text-base">
                        Client & Advocate Weekly Analytics
                    </CardTitle>
                    
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <button 
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="flex items-center gap-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
                            >
                                <Filter size={12} className="text-blue-500" />
                                <span>Compare Months: {selectedMonths.length}</span>
                                <ChevronDown size={12} className={`transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isMenuOpen && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-20" 
                                        onClick={() => setIsMenuOpen(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-30 max-h-80 overflow-y-auto animate-in fade-in zoom-in duration-200">
                                        <div className="p-2 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
                                            <span className="text-[10px] uppercase font-bold text-gray-400">Select Months</span>
                                            <button 
                                                onClick={() => setSelectedMonths([])}
                                                className="text-[10px] text-blue-500 hover:text-blue-600 font-medium"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                        <div className="p-1">
                                            {allAvailableMonths.map(month => (
                                                <button
                                                    key={month}
                                                    onClick={() => toggleMonth(month)}
                                                    className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors text-left"
                                                >
                                                    <span className={`${selectedMonths.includes(month) ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                        {month} {month === currentMonthLabel && <span className="text-[9px] opacity-60 ml-1">(Current)</span>}
                                                    </span>
                                                    {selectedMonths.includes(month) && <Check size={14} className="text-blue-500" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left border-collapse">
                        <thead className="text-gray-700 dark:text-gray-300 uppercase bg-gray-100 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-4 py-3 sticky left-0 bg-gray-100 dark:bg-gray-800 z-10 border-b dark:border-gray-600">Advocate</th>
                                
                                {displayedMonths.map(month => (
                                    <th 
                                        key={month} 
                                        colSpan={5} 
                                        className={`px-3 py-2 text-center border-l border-b dark:border-gray-600 ${month === currentMonthLabel ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'bg-gray-200/50 dark:bg-gray-800/50 opacity-80'}`}
                                    >
                                        {month} {month === currentMonthLabel && "(Current)"}
                                    </th>
                                ))}
                            </tr>
                            <tr className="bg-gray-50 dark:bg-gray-800/30">
                                <th className="px-4 py-2 sticky left-0 bg-gray-50 dark:bg-gray-800 z-10 border-b dark:border-gray-700">Name</th>
                                
                                {displayedMonths.map(month => (
                                    <React.Fragment key={`${month}-header`}>
                                        <th className="px-2 py-2 text-center border-l dark:border-gray-700 opacity-60">W1</th>
                                        <th className="px-2 py-2 text-center opacity-60">W2</th>
                                        <th className="px-2 py-2 text-center opacity-60">W3</th>
                                        <th className="px-2 py-2 text-center opacity-60">W4+</th>
                                        <th className={`px-2 py-2 text-center font-bold border-r dark:border-gray-700 ${month === currentMonthLabel ? 'text-blue-600 dark:text-blue-400' : 'opacity-80'}`}>Total</th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {sortedData.map((item) => (
                                <tr key={item.advocateName} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800 z-10 border-r dark:border-gray-700 whitespace-nowrap">
                                        {item.advocateName}
                                    </td>
                                    
                                    {displayedMonths.map(month => {
                                        const hist = item.history[month] || { week1: 0, week2: 0, week3: 0, week4: 0, total: 0 };
                                        const isCurrent = month === currentMonthLabel;
                                        
                                        return (
                                            <React.Fragment key={`${item.advocateName}-${month}`}>
                                                <td className="px-2 py-2 text-center border-l dark:border-gray-700 text-gray-500">{hist.week1}</td>
                                                <td className="px-2 py-2 text-center text-gray-500">{hist.week2}</td>
                                                <td className="px-2 py-2 text-center text-gray-500">{hist.week3}</td>
                                                <td className="px-2 py-2 text-center text-gray-500">{hist.week4}</td>
                                                <td className={`px-2 py-2 text-center font-bold border-r dark:border-gray-700 ${isCurrent ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/10' : 'text-gray-600 dark:text-gray-400'}`}>
                                                    {hist.total}
                                                </td>
                                            </React.Fragment>
                                        );
                                    })}
                                </tr>
                            ))}
                            {sortedData.length === 0 && (
                                <tr>
                                    <td colSpan={1 + (displayedMonths.length * 5)} className="px-4 py-8 text-center text-gray-500">
                                        No active advocate data found.
                                    </td>
                                </tr>
                            )}
                            {displayedMonths.length === 0 && (
                                <tr>
                                    <td colSpan={1} className="px-4 py-8 text-center text-gray-500 font-medium">
                                        Select at least one month to compare data.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/80 border-t dark:border-gray-700 flex flex-wrap justify-end gap-x-4 gap-y-2 text-[10px] text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full"></span> Current Month Highlight</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Current Month Total</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-400 rounded-full"></span> Historical Weekly Breakdown</span>
                </div>
            </CardContent>
        </Card>
    );
};
