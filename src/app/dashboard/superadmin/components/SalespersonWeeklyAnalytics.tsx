import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSalespersonWeeklyAnalytics } from '../hooks/useSalespersonWeeklyAnalytics';

interface SalespersonWeeklyAnalyticsProps {
    enabled?: boolean;
}

export const SalespersonWeeklyAnalyticsComponent: React.FC<SalespersonWeeklyAnalyticsProps> = ({
    enabled = true
}) => {
    const { data, isLoading } = useSalespersonWeeklyAnalytics(enabled);
    const [historyCount, setHistoryCount] = React.useState(0);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Get historical selection labels
    const historicalMonths = useMemo(() => {
        const labels: string[] = [];
        const now = new Date();
        for (let i = 1; i <= historyCount; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            labels.push(`${monthNames[d.getMonth()]} ${d.getFullYear()}`);
        }
        return labels;
    }, [historyCount]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatShortCurrency = (amount: number) => {
        if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
        if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
        return amount.toString();
    };

    if (isLoading) {
        return (
            <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse flex items-center justify-center">
                <div className="text-gray-400 text-sm">Loading Salesperson Analytics...</div>
            </div>
        );
    }

    return (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg mt-4 overflow-hidden">
            <CardHeader className="pb-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-gray-900 dark:text-white text-base">
                        Salesperson Weekly Revenue Breakdown
                    </CardTitle>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Previous Months:</span>
                        <select 
                            className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white px-2 py-1 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            value={historyCount}
                            onChange={(e) => setHistoryCount(parseInt(e.target.value))}
                        >
                            <option value={0}>None</option>
                            <option value={1}>Last 1 Month</option>
                            <option value={2}>Last 2 Months</option>
                            <option value={3}>Last 3 Months</option>
                            <option value={4}>Last 4 Months</option>
                            <option value={5}>Last 5 Months</option>
                            <option value={6}>Last 6 Months</option>
                            <option value={7}>Last 7 Months</option>
                            <option value={8}>Last 8 Months</option>
                            <option value={9}>Last 9 Months</option>
                            <option value={10}>Last 10 Months</option>
                            <option value={11}>Last 11 Months</option>
                            <option value={12}>Last 12 Months</option>
                        </select>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left border-collapse">
                        <thead className="text-gray-700 dark:text-gray-300 uppercase bg-gray-100 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-4 py-3 sticky left-0 bg-gray-100 dark:bg-gray-800 z-10 border-b dark:border-gray-600">Salesperson</th>
                                
                                {/* Current Month Header */}
                                <th colSpan={5} className="px-3 py-2 text-center border-l border-b dark:border-gray-600 bg-blue-50/50 dark:bg-blue-900/20">
                                    Current Month
                                </th>

                                {/* Historical Months Headers */}
                                {historicalMonths.map(month => (
                                    <th key={month} colSpan={5} className="px-3 py-2 text-center border-l border-b dark:border-gray-600 bg-gray-200/50 dark:bg-gray-800/50 opacity-80">
                                        {month}
                                    </th>
                                ))}
                            </tr>
                            <tr className="bg-gray-50 dark:bg-gray-800/30">
                                <th className="px-4 py-2 sticky left-0 bg-gray-50 dark:bg-gray-800 z-10 border-b dark:border-gray-700">Name</th>
                                
                                {/* Current Month Weeks */}
                                <th className="px-2 py-2 text-center border-l dark:border-gray-700">W1</th>
                                <th className="px-2 py-2 text-center">W2</th>
                                <th className="px-2 py-2 text-center">W3</th>
                                <th className="px-2 py-2 text-center">W4+</th>
                                <th className="px-2 py-2 text-center font-bold text-blue-600 dark:text-blue-400">Total</th>

                                {/* Historical Weeks */}
                                {historicalMonths.map(month => (
                                    <React.Fragment key={`${month}-weeks`}>
                                        <th className="px-2 py-2 text-center border-l dark:border-gray-700 opacity-60">W1</th>
                                        <th className="px-2 py-2 text-center opacity-60">W2</th>
                                        <th className="px-2 py-2 text-center opacity-60">W3</th>
                                        <th className="px-2 py-2 text-center opacity-60">W4+</th>
                                        <th className="px-2 py-2 text-center font-bold opacity-80 border-r dark:border-gray-700">Total</th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {data.map((item, index) => (
                                <tr key={item.salespersonName} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800 z-10 border-r dark:border-gray-700 whitespace-nowrap">
                                        {item.salespersonName}
                                    </td>
                                    
                                    {/* Current Month Data */}
                                    <td className="px-2 py-2 text-center border-l dark:border-gray-700">{formatCurrency(item.weeks.week1)}</td>
                                    <td className="px-2 py-2 text-center">{formatCurrency(item.weeks.week2)}</td>
                                    <td className="px-2 py-2 text-center">{formatCurrency(item.weeks.week3)}</td>
                                    <td className="px-2 py-2 text-center">{formatCurrency(item.weeks.week4)}</td>
                                    <td className="px-2 py-2 text-center font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/10">
                                        {formatCurrency(item.monthlyTotal)}
                                    </td>

                                    {/* Historical Data */}
                                    {historicalMonths.map(month => {
                                        const hist = item.history[month] || { week1: 0, week2: 0, week3: 0, week4: 0, total: 0 };
                                        return (
                                            <React.Fragment key={`${item.salespersonName}-${month}`}>
                                                <td className="px-2 py-2 text-center border-l dark:border-gray-700 text-gray-500">{formatCurrency(hist.week1)}</td>
                                                <td className="px-2 py-2 text-center text-gray-500">{formatCurrency(hist.week2)}</td>
                                                <td className="px-2 py-2 text-center text-gray-500">{formatCurrency(hist.week3)}</td>
                                                <td className="px-2 py-2 text-center text-gray-500">{formatCurrency(hist.week4)}</td>
                                                <td className="px-2 py-2 text-center font-bold text-gray-600 dark:text-gray-400 border-r dark:border-gray-700">
                                                    {formatCurrency(hist.total)}
                                                </td>
                                            </React.Fragment>
                                        );
                                    })}
                                </tr>
                            ))}
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={1 + 5 + (historicalMonths.length * 5)} className="px-4 py-8 text-center text-gray-500">
                                        No active salesperson data found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/80 border-t dark:border-gray-700 flex justify-end gap-4 text-[10px] text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Current Month Total</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-400 rounded-full"></span> Historical Weekly Breakdown</span>
                </div>
            </CardContent>
        </Card>
    );
};
