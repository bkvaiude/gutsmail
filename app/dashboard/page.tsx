'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  _count: { emails: number };
}

interface Email {
  id: string;
  subject: string;
  from: string;
  fromName?: string;
  date: string;
  summary: string;
  aiPriorityScore: number;
  hasImportantInfo: boolean;
  category?: { id: string; name: string; color: string };
}

interface Stats {
  total: number;
  priorities: {
    high: number;
    medium: number;
    low: number;
  };
  importantInfo: number;
  byCategory: Record<string, {
    name: string;
    high: number;
    medium: number;
    low: number;
    important: number;
    total: number;
  }>;
}

interface GmailAccount {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>(''); // 'high', 'medium', 'low', or ''
  const [selectedImportant, setSelectedImportant] = useState<boolean>(false);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Handle OAuth callback messages
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const email = searchParams.get('email');

    if (success === 'account_added') {
      toast.success(`Gmail account ${email || ''} added successfully`);
      loadGmailAccounts();
      // Clean up URL
      router.replace('/dashboard');
    } else if (success === 'account_updated') {
      toast.success(`Gmail account ${email || ''} updated successfully`);
      loadGmailAccounts();
      router.replace('/dashboard');
    } else if (error) {
      const errorMessages: Record<string, string> = {
        oauth_failed: 'OAuth authentication failed',
        missing_params: 'Missing required parameters',
        invalid_state: 'Invalid state parameter',
        token_exchange_failed: 'Failed to exchange tokens',
        userinfo_failed: 'Failed to fetch user info',
        server_error: 'Server error occurred',
        unauthorized: 'You must be logged in',
      };
      toast.error(errorMessages[error] || 'An error occurred');
      router.replace('/dashboard');
    }
  }, [searchParams]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      loadCategories();
      loadStats();
      loadEmails();
      loadGmailAccounts();
    }
  }, [status, selectedCategory, selectedPriority, selectedImportant]);

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch('/api/emails/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadGmailAccounts = async () => {
    try {
      const res = await fetch('/api/gmail-accounts');
      if (res.ok) {
        const data = await res.json();
        setGmailAccounts(data);
      }
    } catch (error) {
      console.error('Error loading Gmail accounts:', error);
    }
  };

  const loadEmails = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (selectedCategory !== 'all') {
        params.append('categoryId', selectedCategory);
      }
      if (selectedPriority) {
        params.append('priority', selectedPriority);
      }
      if (selectedImportant) {
        params.append('important', 'true');
      }

      const url = `/api/emails/by-category${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
      }
    } catch (error) {
      console.error('Error loading emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await fetch('/api/emails/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxEmails: 20 }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Imported ${data.imported} emails, skipped ${data.skipped}`);
        loadEmails();
        loadCategories();
        loadStats();
      }
    } catch (error) {
      console.error('Error importing:', error);
      toast.error('Failed to import emails');
    } finally {
      setImporting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEmails.size === 0) return;

    const emailIds = Array.from(selectedEmails);

    // AI Safety check
    toast.loading('AI analyzing emails for safety...', { id: 'analyzing' });
    const analyzeRes = await fetch('/api/emails/bulk-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailIds }),
    });

    if (analyzeRes.ok) {
      const analysis = await analyzeRes.json();
      toast.dismiss('analyzing');

      if (analysis.shouldReview.length > 0) {
        const message = `AI Safety Check:\n\n${analysis.shouldReview.length} emails flagged for review:\n${analysis.shouldReview.slice(0, 5).map((e: any) => `- ${e.reason}`).join('\n')}\n\nProceed with deletion?`;
        if (!confirm(message)) {
          toast('Deletion cancelled');
          return;
        }
      } else {
        toast.success('All emails safe to delete');
      }
    } else {
      toast.dismiss('analyzing');
    }

    const res = await fetch('/api/emails/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailIds }),
    });

    if (res.ok) {
      const data = await res.json();
      toast.success(`Deleted ${data.deleted} emails`);
      setSelectedEmails(new Set());
      loadEmails();
    }
  };

  const handleUnsubscribe = async () => {
    if (selectedEmails.size === 0) return;

    const res = await fetch('/api/emails/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailIds: Array.from(selectedEmails), useAI: false }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.count > 0) {
        data.links.forEach((link: any) => {
          window.open(link.link, '_blank');
        });
        toast.success(`Opened ${data.count} unsubscribe links in new tabs`);
      } else {
        toast('No unsubscribe links found in selected emails');
      }
    }
  };

  const handleAIUnsubscribe = async () => {
    if (selectedEmails.size === 0) return;

    toast('Starting AI unsubscribe agent... This may take a few minutes', { duration: 5000 });

    const res = await fetch('/api/emails/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailIds: Array.from(selectedEmails), useAI: true }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.count > 0) {
        const successMsg = `AI Unsubscribe Complete!\n✅ Successful: ${data.successCount}\n❌ Failed: ${data.failCount}\n📧 Total: ${data.count}`;
        toast.success(successMsg);

        // Show detailed results in console
        console.log('AI Unsubscribe Results:', data.results);
      } else {
        toast('No unsubscribe links found in selected emails');
      }
    } else {
      toast.error('Failed to run AI unsubscribe agent');
    }
  };

  const toggleEmailSelection = (id: string) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedEmails(newSelected);
  };

  const handleConnectAccount = () => {
    // Redirect to OAuth flow for adding a new Gmail account
    window.location.href = '/api/auth/add-account';
  };

  const handleToggleAccount = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/gmail-accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (res.ok) {
        toast.success(isActive ? 'Account activated' : 'Account deactivated');
        loadGmailAccounts();
      }
    } catch (error) {
      console.error('Error toggling account:', error);
      toast.error('Failed to update account');
    }
  };

  const handleRemoveAccount = async (id: string) => {
    if (!confirm('Are you sure you want to remove this Gmail account?')) return;

    try {
      const res = await fetch(`/api/gmail-accounts/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Account removed');
        loadGmailAccounts();
      }
    } catch (error) {
      console.error('Error removing account:', error);
      toast.error('Failed to remove account');
    }
  };

  const selectAll = () => {
    if (selectedEmails.size === emails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(emails.map(e => e.id)));
    }
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="h-screen bg-white overflow-hidden">
      <div className="flex h-full relative overflow-hidden">
        {/* Mobile Overlay Backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`fixed lg:static w-64 lg:w-80 h-full flex-shrink-0 bg-[#f8f9fa] border-r border-[#dadce0] flex flex-col z-40 transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
        <div className="p-4">
          <h1 className="text-xl font-normal text-gray-900">GutsMail</h1>
          <p className="text-xs text-gray-500 mt-0.5">by Highguts Solutions</p>
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={handleImport}
            disabled={importing}
            className="w-full px-4 py-2 bg-[#1a73e8] text-white rounded hover:bg-[#1765cc] disabled:opacity-50 text-sm"
          >
            {importing ? 'Importing...' : 'Import Emails'}
          </button>
        </div>

        <nav className="flex-1 px-2 overflow-y-auto overflow-x-hidden">
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSelectedPriority('');
              setSelectedImportant(false);
              setIsSidebarOpen(false);
            }}
            className={`w-full text-left px-4 py-1.5 lg:py-2 rounded-r text-sm ${
              selectedCategory === 'all' && !selectedPriority && !selectedImportant
                ? 'bg-[#e8f0fe] text-[#1a73e8]'
                : 'hover:bg-gray-200 text-gray-700'
            }`}
          >
            All Mail ({stats?.total || 0})
          </button>

          <button
            onClick={() => {
              router.push('/insights');
              setIsSidebarOpen(false);
            }}
            className="w-full text-left px-4 py-1.5 lg:py-2 rounded-r text-sm hover:bg-gray-200 text-gray-700"
          >
            Insights Dashboard
          </button>

          {/* CONNECTED ACCOUNTS Section */}
          <div className="mt-3 lg:mt-4 px-4 text-xs text-gray-600 font-medium">CONNECTED ACCOUNTS</div>

          {gmailAccounts.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">
              No accounts connected
            </div>
          ) : (
            gmailAccounts.map((account) => (
              <div
                key={account.id}
                className="w-full px-4 py-1.5 lg:py-2 text-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={account.isActive}
                    onChange={(e) => handleToggleAccount(account.id, e.target.checked)}
                    className="flex-shrink-0"
                  />
                  <span className="truncate text-gray-700">{account.email}</span>
                </div>
                <button
                  onClick={() => handleRemoveAccount(account.id)}
                  className="ml-2 text-red-600 hover:text-red-800 flex-shrink-0"
                  title="Remove account"
                >
                  ✕
                </button>
              </div>
            ))
          )}

          <button
            onClick={handleConnectAccount}
            className="w-full text-left px-4 py-1.5 lg:py-2 rounded-r text-sm text-[#1a73e8] hover:bg-gray-200"
          >
            + Connect Account
          </button>

          {/* PRIORITIES Section */}
          <div className="mt-3 lg:mt-4 px-4 text-xs text-gray-600 font-medium">PRIORITIES</div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-2 lg:flex-wrap px-2 lg:px-4 py-1 min-h-[40px] lg:min-h-[36px]">
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedPriority('high');
                setSelectedImportant(false);
                setIsSidebarOpen(false);
              }}
              title="High Priority"
              className={`px-4 py-1.5 lg:px-3 lg:py-1 rounded text-sm ${
                selectedPriority === 'high'
                  ? 'bg-[#e8f0fe] text-[#1a73e8]'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
            >
              🔴 ({stats?.priorities.high || 0}{stats?.priorities.high && stats.priorities.high > 99 ? '+' : ''})
            </button>

            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedPriority('medium');
                setSelectedImportant(false);
                setIsSidebarOpen(false);
              }}
              title="Medium Priority"
              className={`px-4 py-1.5 lg:px-3 lg:py-1 rounded text-sm ${
                selectedPriority === 'medium'
                  ? 'bg-[#e8f0fe] text-[#1a73e8]'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
            >
              🟡 ({stats?.priorities.medium || 0}{stats?.priorities.medium && stats.priorities.medium > 99 ? '+' : ''})
            </button>

            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedPriority('low');
                setSelectedImportant(false);
                setIsSidebarOpen(false);
              }}
              title="Low Priority"
              className={`px-4 py-1.5 lg:px-3 lg:py-1 rounded text-sm ${
                selectedPriority === 'low'
                  ? 'bg-[#e8f0fe] text-[#1a73e8]'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
            >
              🟢 ({stats?.priorities.low || 0}{stats?.priorities.low && stats.priorities.low > 99 ? '+' : ''})
            </button>
          </div>

          {/* CATEGORIES Section */}
          <div className="mt-3 lg:mt-4 px-4 text-xs text-gray-600 font-medium">CATEGORIES</div>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setSelectedPriority('');
                setSelectedImportant(false);
                setIsSidebarOpen(false);
              }}
              className={`w-full text-left px-4 py-1.5 lg:py-2 rounded-r text-sm flex items-center justify-between ${
                selectedCategory === cat.id && !selectedPriority && !selectedImportant
                  ? 'bg-[#e8f0fe] text-[#1a73e8]'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
            >
              <span>{cat.name}</span>
              <span className="text-xs text-gray-500">{cat._count.emails}</span>
            </button>
          ))}

          <button
            onClick={() => setShowNewCategory(true)}
            className="w-full text-left px-4 py-1.5 lg:py-2 rounded-r text-sm text-[#1a73e8] hover:bg-gray-200"
          >
            + New Category
          </button>
        </nav>

        <div className="p-4 border-t border-[#dadce0]">
          <button
            onClick={() => signOut()}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Hamburger Menu */}
        {selectedEmails.size === 0 && (
          <div className="lg:hidden px-4 py-3 border-b border-[#dadce0] flex items-center">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-gray-600 hover:text-gray-900 mr-3"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-normal text-gray-900">GutsMail</h1>
          </div>
        )}

        {/* Toolbar */}
        {selectedEmails.size > 0 && (
          <div className="px-4 py-2 border-b border-[#dadce0] flex items-center gap-4 bg-[#f0f0f0]">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden text-gray-600 hover:text-gray-900"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-sm text-gray-600">{selectedEmails.size} selected</span>
            <button
              onClick={handleBulkDelete}
              className="text-sm text-gray-700 hover:text-gray-900"
            >
              Delete
            </button>
            <button
              onClick={handleUnsubscribe}
              className="text-sm text-gray-700 hover:text-gray-900"
              title="Open unsubscribe links in new tabs"
            >
              Unsubscribe
            </button>
            <button
              onClick={handleAIUnsubscribe}
              className="text-sm text-[#1a73e8] hover:text-[#1557b0] font-medium"
              title="Use AI to automatically complete unsubscribe process"
            >
              🤖 AI Unsubscribe
            </button>
            <button
              onClick={() => setSelectedEmails(new Set())}
              className="text-sm text-gray-700 hover:text-gray-900"
            >
              Clear selection
            </button>
          </div>
        )}

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {!selectedEmails.size && (
            <div className="px-4 py-2 border-b border-[#dadce0] flex items-center">
              <input
                type="checkbox"
                checked={selectedEmails.size === emails.length && emails.length > 0}
                onChange={selectAll}
                className="mr-3"
              />
              <span className="text-sm text-gray-600">Select all</span>
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading emails...</div>
          ) : emails.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No emails found.</p>
              <p className="text-sm mt-2">Click "Import Emails" to get started</p>
            </div>
          ) : (
            emails.map((email) => (
              <div
                key={email.id}
                className={`px-3 sm:px-4 py-3 border-b border-[#dadce0] hover:bg-[#f5f5f5] cursor-pointer ${
                  selectedEmails.has(email.id) ? 'bg-[#e8f0fe]' : ''
                }`}
                onClick={(e) => {
                  if ((e.target as HTMLElement).tagName !== 'INPUT') {
                    router.push(`/emails/${email.id}`);
                  }
                }}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <input
                    type="checkbox"
                    checked={selectedEmails.has(email.id)}
                    onChange={() => toggleEmailSelection(email.id)}
                    className="mt-1 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <span className="font-medium text-sm text-gray-900 truncate">
                        {email.fromName || email.from}
                      </span>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {new Date(email.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-900 truncate mt-0.5">
                      {email.subject}
                    </div>
                    <div className="text-sm text-gray-600 truncate mt-0.5">
                      {email.summary}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {email.category && (
                        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: email.category.color + '20', color: email.category.color }}>
                          {email.category.name}
                        </span>
                      )}
                      {email.hasImportantInfo && (
                        <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">
                          Important Info
                        </span>
                      )}
                      {email.aiPriorityScore >= 70 && (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded">
                          High Priority
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* New Category Modal */}
      {showNewCategory && (
        <NewCategoryModal
          onClose={() => setShowNewCategory(false)}
          onSuccess={() => {
            loadCategories();
            setShowNewCategory(false);
          }}
        />
      )}
      </div>
    </div>
  );
}

function NewCategoryModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      if (res.ok) {
        onSuccess();
        toast.success('Category created successfully');
      } else {
        toast.error('Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-normal mb-4">New Category</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              rows={3}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#1a73e8] text-white rounded hover:bg-[#1765cc] disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
