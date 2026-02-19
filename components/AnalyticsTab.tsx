

import React, { useState, useEffect, useMemo } from 'react';
import { Subject } from '../types';
import { supabase } from '../services/supabaseClient';
import { getErrorMessage } from '../utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { RefreshIcon, ChartBarIcon, TableCellsIcon, ArrowDownTrayIcon, CogIcon } from './icons';

// Declare XLSX for TypeScript since it's loaded via script tag
declare const XLSX: any;

interface AnalyticsTabProps {
    subject: Subject;
}

interface AnalyticsData {
    student_name: string;
    deck_title: string;
    score_percentage: number;
    completed_at: string;
}

const CHART_COLORS = [
  '#3A728E', '#86B6C6', '#1F5372', '#F59E0B', '#10B981', '#6366F1', '#EC4899',
  '#f43f5e', '#8b5cf6', '#22c55e', '#d97706', '#0891b2', '#65a30d', '#be185d'
];

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ subject }) => {
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

    const handleRefresh = () => setRefreshTrigger(t => t + 1);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Ensure ID is parsed as a number for the RPC call
                const subjectIdInt = parseInt(subject.id, 10);
                if (isNaN(subjectIdInt)) {
                    throw new Error("Invalid subject ID");
                }

                const { data, error: rpcError } = await supabase.rpc('get_subject_analytics', {
                    p_subject_id: subjectIdInt
                });
                if (rpcError) throw rpcError;
                setAnalyticsData(data || []);
            } catch (err) {
                setError(getErrorMessage(err));
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalytics();
    }, [subject.id, refreshTrigger]);

    const { chartData, studentNames, assessmentNames } = useMemo(() => {
        if (!analyticsData || analyticsData.length === 0) {
            return { chartData: [], studentNames: [], assessmentNames: [] };
        }

        const students = [...new Set(analyticsData.map(d => d.student_name))].sort();
        
        const assessments = new Map<string, string>();
        analyticsData.forEach(d => {
            if (!assessments.has(d.deck_title)) {
                assessments.set(d.deck_title, d.completed_at);
            }
        });

        const sortedAssessments = [...assessments.entries()]
            .sort((a, b) => new Date(a[1]).getTime() - new Date(b[1]).getTime())
            .map(entry => entry[0]);

        const dataForChart = students.map(studentName => {
            const entry: { [key: string]: string | number | null } = { name: studentName as string };
            sortedAssessments.forEach(deckTitle => {
                const scoreEntry = analyticsData.find(d => d.student_name === studentName && d.deck_title === deckTitle);
                entry[deckTitle] = scoreEntry ? scoreEntry.score_percentage : null;
            });
            return entry;
        });

        return { chartData: dataForChart, studentNames: students, assessmentNames: sortedAssessments };
    }, [analyticsData]);

    const handleDownloadXLS = () => {
        if (!chartData || chartData.length === 0) return;

        // Format data for Excel
        const excelData = chartData.map(row => {
            const newRow: Record<string, any> = { 'Student Name': row.name };
            assessmentNames.forEach(deckTitle => {
                // Use '-' for missing scores in the Excel file for readability, or keep null/empty
                newRow[deckTitle] = row[deckTitle] !== null ? row[deckTitle] : '-';
            });
            return newRow;
        });

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Grades");

        // Generate filename with current date
        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `${subject.title.replace(/[^a-z0-9]/gi, '_')}_Grades_${dateStr}.xlsx`;

        // Download file
        XLSX.writeFile(wb, fileName);
    };


    if (isLoading) {
        return <div className="text-center p-12 text-primary-500 dark:text-gray-400">Loading analytics...</div>;
    }
    
    if (error) {
        const isDatabaseError = error.includes('DATABASE_ERROR') || error.includes('SCHEMA_CACHE_ERROR');
        return (
            <div className="p-4">
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex flex-col gap-3" role="alert">
                    <div className="flex justify-between items-start">
                        <span className="whitespace-pre-wrap">{error}</span>
                        <button onClick={handleRefresh} className="ml-4 p-1 hover:bg-red-200 dark:hover:bg-red-800/50 rounded-full flex-shrink-0">
                            <RefreshIcon className="w-5 h-5" />
                        </button>
                    </div>
                    {isDatabaseError && (
                         <button 
                            onClick={() => window.location.hash = '#/settings'}
                            className="self-start text-sm font-bold bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-100 px-3 py-1.5 rounded-md hover:bg-red-300 dark:hover:bg-red-700 transition-colors flex items-center gap-2"
                        >
                            <CogIcon className="w-4 h-4" />
                            Go to Settings to Fix
                        </button>
                    )}
                </div>
            </div>
        );
    }
    
    if (analyticsData.length === 0) {
        return (
            <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-primary-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-primary-600 dark:text-gray-200">No Analytics Data Yet</h2>
                <p className="text-primary-500 dark:text-gray-400 mt-2">Assign an "Assessment" deck and have students complete it to see their scores here.</p>
                <button 
                    onClick={handleRefresh} 
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-gray-300 bg-primary-100 dark:bg-gray-700 hover:bg-primary-200 dark:hover:bg-gray-600 rounded-md py-2 px-4 transition-colors"
                >
                    <RefreshIcon className="w-4 h-4" /> Check Again
                </button>
            </div>
        );
    }
    
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl w-full border border-primary-200 dark:border-gray-700 animate-[fade-in_0.5s_ease-out]">
             <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200">Student Performance</h3>
                
                <div className="flex items-center gap-2 flex-wrap">
                    {/* View Toggle */}
                    <div className="flex bg-primary-100 dark:bg-gray-700 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('chart')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'chart' ? 'bg-white dark:bg-gray-600 shadow text-primary-700 dark:text-primary-200' : 'text-primary-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-gray-300'}`}
                            title="View Graph"
                        >
                            <ChartBarIcon className="w-4 h-4" />
                            Graph
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-white dark:bg-gray-600 shadow text-primary-700 dark:text-primary-200' : 'text-primary-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-gray-300'}`}
                            title="View Table"
                        >
                            <TableCellsIcon className="w-4 h-4" />
                            Table
                        </button>
                    </div>

                    {/* Action Buttons */}
                    <button 
                        onClick={handleDownloadXLS}
                        className="flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-gray-300 bg-primary-100 dark:bg-gray-700 hover:bg-primary-200 dark:hover:bg-gray-600 rounded-md py-1.5 px-3 transition-colors"
                        title="Download as Excel"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Export
                    </button>
                    <button 
                        onClick={handleRefresh} 
                        disabled={isLoading} 
                        className="flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-gray-300 bg-primary-100 dark:bg-gray-700 hover:bg-primary-200 dark:hover:bg-gray-600 rounded-md py-1.5 px-3 transition-colors disabled:opacity-50"
                    >
                        <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {viewMode === 'chart' ? (
                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <LineChart 
                            data={chartData}
                            margin={{ top: 5, right: 20, left: -10, bottom: 20 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke={document.documentElement.classList.contains('dark') ? '#4A5562' : '#E2E8F0'} />
                            <XAxis 
                                dataKey="name" 
                                stroke={document.documentElement.classList.contains('dark') ? '#A0AEC0' : '#4A5568'} 
                                fontSize={12} 
                                angle={studentNames.length > 5 ? -20 : 0}
                                textAnchor={studentNames.length > 5 ? "end" : "middle"}
                                height={60}
                                tick={{ dy: 10 }}
                                interval={0}
                            />
                            <YAxis domain={[0, 100]} stroke={document.documentElement.classList.contains('dark') ? '#A0AEC0' : '#4A5568'} fontSize={12} unit="%" />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: document.documentElement.classList.contains('dark') ? '#1A202C' : '#FFFFFF',
                                    borderColor: document.documentElement.classList.contains('dark') ? '#4A5568' : '#E2E8F0',
                                    borderRadius: '0.5rem',
                                }}
                                labelStyle={{ color: document.documentElement.classList.contains('dark') ? '#E2E8F0' : '#2D3748', fontWeight: 'bold' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                            {assessmentNames.map((assessmentName, index) => (
                                <Line 
                                    key={assessmentName as string}
                                    type="monotone" 
                                    dataKey={assessmentName as string}
                                    stroke={CHART_COLORS[index % CHART_COLORS.length]}
                                    strokeWidth={2}
                                    activeDot={{ r: 6 }} 
                                    connectNulls={true}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-primary-200 dark:divide-gray-700">
                        <thead className="bg-primary-50 dark:bg-gray-700/50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-primary-600 dark:text-gray-200 uppercase tracking-wider sticky left-0 bg-primary-50 dark:bg-gray-800 z-10 shadow-sm">
                                    Student Name
                                </th>
                                {assessmentNames.map((name) => (
                                    <th key={name} scope="col" className="px-6 py-3 text-center text-xs font-medium text-primary-500 dark:text-gray-400 uppercase tracking-wider min-w-[150px]">
                                        {name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-primary-200 dark:divide-gray-700">
                            {chartData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-primary-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-800 shadow-sm">
                                        {row.name}
                                    </td>
                                    {assessmentNames.map((deckTitle) => {
                                        const score = row[deckTitle];
                                        let scoreColor = 'text-gray-400';
                                        if (typeof score === 'number') {
                                            if (score >= 80) scoreColor = 'text-green-600 font-bold';
                                            else if (score >= 50) scoreColor = 'text-yellow-600 font-medium';
                                            else scoreColor = 'text-red-600';
                                        }
                                        
                                        return (
                                            <td key={deckTitle} className={`px-6 py-4 whitespace-nowrap text-sm text-center ${scoreColor}`}>
                                                {score !== null ? `${score}%` : '-'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AnalyticsTab;