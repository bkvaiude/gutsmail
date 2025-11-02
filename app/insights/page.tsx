'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Insights {
  today: {
    emailsProcessed: number;
    emailsArchived: number;
    emailsDeleted: number;
    timeSavedMins: number;
    inboxHealthScore: number;
  } | null;
  weekly: {
    emailsProcessed: number;
    emailsArchived: number;
    emailsDeleted: number;
    timeSavedMins: number;
  };
  topSenders: Array<{
    email: string;
    name?: string;
    totalEmails: number;
    importance: number;
    aiSummary?: string;
  }>;
  stats: {
    totalEmails: number;
    highPriorityCount: number;
    importantInfoCount: number;
    inboxHealthScore: number;
  };
}

export default function InsightsDashboard() {
  const router = useRouter();
  const { status } = useSession();
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      loadInsights();
    }
  }, [status]);

  const loadInsights = async () => {
    try {
      const res = await fetch('/api/insights');
      if (res.ok) {
        const data = await res.json();
        setInsights(data);
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const healthScore = insights?.stats.inboxHealthScore || 50;
  const healthColor =
    healthScore >= 70 ? 'text-green-600' : healthScore >= 40 ? 'text-yellow-600' : 'text-red-600';
  const healthBg =
    healthScore >= 70 ? 'bg-green-100' : healthScore >= 40 ? 'bg-yellow-100' : 'bg-red-100';

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            Back to inbox
          </button>
          <h1 className="text-3xl font-normal text-gray-900">HighGuts Insights Dashboard</h1>
          <p className="text-gray-600 mt-1">AI-powered email intelligence by HighGuts Solutions</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Inbox Health"
            value={`${healthScore}/100`}
            className={`${healthBg} ${healthColor}`}
            description="Your email management score"
          />
          <MetricCard
            title="Time Saved This Week"
            value={`${Math.floor((insights?.weekly.timeSavedMins || 0) / 60)}h ${(insights?.weekly.timeSavedMins || 0) % 60}m`}
            className="bg-blue-100 text-blue-600"
            description="By auto-archiving emails"
          />
          <MetricCard
            title="Emails Processed"
            value={insights?.weekly.emailsProcessed || 0}
            className="bg-purple-100 text-purple-600"
            description="Last 7 days"
          />
          <MetricCard
            title="High Priority"
            value={insights?.stats.highPriorityCount || 0}
            className="bg-red-100 text-red-600"
            description="Emails needing attention"
          />
        </div>

        {/* Today's Activity */}
        {insights?.today && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-medium text-gray-900 mb-4">Today's Activity</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-semibold text-gray-900">
                  {insights.today.emailsProcessed}
                </div>
                <div className="text-sm text-gray-600">Emails Processed</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">
                  {insights.today.emailsDeleted}
                </div>
                <div className="text-sm text-gray-600">Emails Deleted</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">
                  {insights.today.timeSavedMins} mins
                </div>
                <div className="text-sm text-gray-600">Time Saved</div>
              </div>
            </div>
          </div>
        )}

        {/* Weekly Summary */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-medium text-gray-900 mb-4">Weekly Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-3xl font-semibold text-gray-900">
                {insights?.weekly.emailsArchived || 0}
              </div>
              <div className="text-sm text-gray-600">Emails Archived</div>
            </div>
            <div>
              <div className="text-3xl font-semibold text-gray-900">
                {insights?.weekly.emailsDeleted || 0}
              </div>
              <div className="text-sm text-gray-600">Emails Deleted</div>
            </div>
            <div>
              <div className="text-3xl font-semibold text-gray-900">
                {Math.floor((insights?.weekly.timeSavedMins || 0) / 60)}h {(insights?.weekly.timeSavedMins || 0) % 60}m
              </div>
              <div className="text-sm text-gray-600">Time Saved</div>
            </div>
          </div>
        </div>

        {/* Top Senders */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-medium text-gray-900 mb-4">Top Senders</h2>
          <div className="space-y-3">
            {insights?.topSenders.slice(0, 10).map((sender) => (
              <div
                key={sender.email}
                className="flex items-center justify-between border-b border-gray-200 pb-3"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {sender.name || sender.email}
                  </div>
                  <div className="text-sm text-gray-600">{sender.email}</div>
                  {sender.aiSummary && (
                    <div className="text-sm text-gray-500 mt-1">{sender.aiSummary}</div>
                  )}
                </div>
                <div className="text-right ml-4">
                  <div className="text-sm font-medium text-gray-900">
                    {sender.totalEmails} emails
                  </div>
                  <div className="text-xs text-gray-600">
                    Importance: {sender.importance}/100
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Important Info Count */}
        {insights && insights.stats.importantInfoCount > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-medium text-yellow-900 mb-2">
              Attention Required
            </h3>
            <p className="text-sm text-yellow-800">
              You have {insights.stats.importantInfoCount} emails containing important information
              like tracking numbers, dates, or confirmations that you might want to review.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  className,
  description,
}: {
  title: string;
  value: string | number;
  className: string;
  description: string;
}) {
  return (
    <div className={`rounded-lg p-6 ${className}`}>
      <div className="text-sm font-medium mb-1">{title}</div>
      <div className="text-3xl font-semibold mb-1">{value}</div>
      <div className="text-xs opacity-80">{description}</div>
    </div>
  );
}
