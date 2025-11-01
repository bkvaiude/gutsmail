'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      loadCategories();
      loadEmails();
    }
  }, [status, selectedCategory]);

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

  const loadEmails = async () => {
    try {
      setLoading(true);
      const url = selectedCategory === 'all'
        ? '/api/emails/by-category'
        : `/api/emails/by-category?categoryId=${selectedCategory}`;
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
        alert(`Imported ${data.imported} emails, skipped ${data.skipped}`);
        loadEmails();
        loadCategories();
      }
    } catch (error) {
      console.error('Error importing:', error);
      alert('Failed to import emails');
    } finally {
      setImporting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEmails.size === 0) return;

    const emailIds = Array.from(selectedEmails);

    // AI Safety check
    const analyzeRes = await fetch('/api/emails/bulk-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailIds }),
    });

    if (analyzeRes.ok) {
      const analysis = await analyzeRes.json();

      if (analysis.shouldReview.length > 0) {
        const message = `AI Safety Check:\n\n${analysis.shouldReview.length} emails flagged for review:\n${analysis.shouldReview.slice(0, 5).map((e: any) => `- ${e.reason}`).join('\n')}\n\nProceed with deletion?`;
        if (!confirm(message)) return;
      }
    }

    const res = await fetch('/api/emails/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailIds }),
    });

    if (res.ok) {
      const data = await res.json();
      alert(`Deleted ${data.deleted} emails`);
      setSelectedEmails(new Set());
      loadEmails();
    }
  };

  const handleUnsubscribe = async () => {
    if (selectedEmails.size === 0) return;

    const res = await fetch('/api/emails/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailIds: Array.from(selectedEmails) }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.count > 0) {
        data.links.forEach((link: any) => {
          window.open(link.link, '_blank');
        });
        alert(`Opened ${data.count} unsubscribe links in new tabs`);
      } else {
        alert('No unsubscribe links found in selected emails');
      }
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
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-64 bg-[#f8f9fa] border-r border-[#dadce0] flex flex-col">
        <div className="p-4">
          <h1 className="text-xl font-normal text-gray-900">Email Intelligence</h1>
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

        <nav className="flex-1 px-2 overflow-y-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`w-full text-left px-4 py-2 rounded-r text-sm ${
              selectedCategory === 'all'
                ? 'bg-[#e8f0fe] text-[#1a73e8]'
                : 'hover:bg-gray-200 text-gray-700'
            }`}
          >
            All Mail ({emails.length})
          </button>

          <button
            onClick={() => router.push('/insights')}
            className="w-full text-left px-4 py-2 rounded-r text-sm hover:bg-gray-200 text-gray-700"
          >
            Insights Dashboard
          </button>

          <div className="mt-4 px-4 text-xs text-gray-600 font-medium">CATEGORIES</div>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`w-full text-left px-4 py-2 rounded-r text-sm flex items-center justify-between ${
                selectedCategory === cat.id
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
            className="w-full text-left px-4 py-2 rounded-r text-sm text-[#1a73e8] hover:bg-gray-200"
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
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        {selectedEmails.size > 0 && (
          <div className="px-4 py-2 border-b border-[#dadce0] flex items-center gap-4 bg-[#f0f0f0]">
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
            >
              Unsubscribe
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
                className={`px-4 py-3 border-b border-[#dadce0] hover:bg-[#f5f5f5] cursor-pointer ${
                  selectedEmails.has(email.id) ? 'bg-[#e8f0fe]' : ''
                }`}
                onClick={(e) => {
                  if ((e.target as HTMLElement).tagName !== 'INPUT') {
                    router.push(`/emails/${email.id}`);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedEmails.has(email.id)}
                    onChange={() => toggleEmailSelection(email.id)}
                    className="mt-1"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-900 truncate">
                        {email.fromName || email.from}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {new Date(email.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-900 truncate mt-0.5">
                      {email.subject}
                    </div>
                    <div className="text-sm text-gray-600 truncate mt-0.5">
                      {email.summary}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
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
      } else {
        alert('Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Failed to create category');
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
