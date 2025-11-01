'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Email {
  id: string;
  subject: string;
  from: string;
  fromName?: string;
  to: string;
  date: string;
  body: string;
  htmlBody?: string;
  summary: string;
  category?: { id: string; name: string; color: string };
  aiPriorityScore: number;
  hasImportantInfo: boolean;
  importantInfoFlags?: string;
  unsubscribeLink?: string;
}

export default function EmailDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { status } = useSession();
  const [email, setEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      loadEmail();
    }
  }, [status, params.id]);

  const loadEmail = async () => {
    try {
      const res = await fetch(`/api/emails/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setEmail(data);
      } else {
        alert('Email not found');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error loading email:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!email) {
    return <div className="min-h-screen flex items-center justify-center">Email not found</div>;
  }

  const importantFlags = email.importantInfoFlags
    ? JSON.parse(email.importantInfoFlags)
    : [];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="border-b border-gray-200 p-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            Back to inbox
          </button>
        </div>

        {/* Email Content */}
        <div className="p-6">
          <h1 className="text-2xl font-normal text-gray-900 mb-4">{email.subject}</h1>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-medium text-gray-900">
                  {email.fromName || email.from}
                </div>
                <div className="text-sm text-gray-600">{email.from}</div>
              </div>
              <div className="text-sm text-gray-600">
                {new Date(email.date).toLocaleString()}
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-4">
              To: {email.to}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {email.category && (
                <span
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    backgroundColor: email.category.color + '20',
                    color: email.category.color,
                  }}
                >
                  {email.category.name}
                </span>
              )}
              {email.hasImportantInfo && (
                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                  Contains Important Info
                </span>
              )}
              {email.aiPriorityScore >= 70 && (
                <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
                  High Priority ({email.aiPriorityScore}/100)
                </span>
              )}
              {importantFlags.length > 0 && (
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  Flags: {importantFlags.join(', ')}
                </span>
              )}
            </div>

            {/* AI Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
              <div className="text-sm font-medium text-blue-900 mb-1">AI Summary</div>
              <div className="text-sm text-blue-800">{email.summary}</div>
            </div>

            {/* Unsubscribe Link */}
            {email.unsubscribeLink && (
              <div className="mb-4">
                <a
                  href={email.unsubscribeLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Unsubscribe from this sender
                </a>
              </div>
            )}
          </div>

          {/* Email Body */}
          <div className="border-t border-gray-200 pt-6">
            {email.htmlBody ? (
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: email.htmlBody }}
              />
            ) : (
              <div className="whitespace-pre-wrap text-gray-900">{email.body}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
