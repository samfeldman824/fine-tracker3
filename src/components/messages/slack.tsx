import React, { useState, useEffect } from 'react';
import { MessageCircle, MoreVertical, Smile, Reply, Bookmark } from 'lucide-react';
import type { FineWithUsersQuery } from '@/types/api';
import { createClient } from '@/lib/supabase/client';


// You'll need to import this from your actual file
// import { getFines } from '@/path/to/your/getFines';

const FinesSlackInterface = () => {
  const [fines, setFines] = useState<FineWithUsersQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterPlayer, setFilterPlayer] = useState('');

  useEffect(() => {
    const fetchFines = async () => {
      setLoading(true);
      try {
        const supabase = createClient();

        const { data, error } = await supabase
        .from('fines')
        .select(`
          id,
          date,
          fine_type,
          description,
          amount,
          replies,
          subject:users!fines_subject_id_fkey(name),
          proposer:users!fines_proposer_id_fkey(name)
        `);
        
        const sampleData: FineWithUsersQuery[] = [
          {
            id: '1',
            date: '2025-08-17T15:52:00Z',
            fine_type: 'Fine',
            description: 'jittiness',
            amount: 300, // assuming cents
            replies: 0,
            subject: { name: 'Toby Luo' },
            proposer: { name: 'Sam Feldman' }
          },
          {
            id: '2',
            date: '2025-08-17T15:55:00Z',
            fine_type: 'Credit',
            description: 'haha',
            amount: 100,
            replies: 0,
            subject: { name: 'Sam Feldman' },
            proposer: { name: 'Sam Feldman' }
          },
          {
            id: '3',
            date: '2025-08-17T16:12:00Z',
            fine_type: 'Credit',
            description: 'dece',
            amount: 100,
            replies: 0,
            subject: { name: 'James Lian' },
            proposer: { name: 'Sam Feldman' }
          },
          {
            id: '4',
            date: '2025-08-17T16:18:00Z',
            fine_type: 'Warning',
            description: 'blah',
            amount: 0,
            replies: 0,
            subject: { name: 'Sam Feldman' },
            proposer: { name: 'James Lian' }
          },
          {
            id: '5',
            date: '2025-08-17T16:25:00Z',
            fine_type: 'Fine',
            description: 'being such a jitter critter that we had to go to your jitty ah room bugger cousin',
            amount: 100,
            replies: 1,
            subject: { name: 'James Lian' },
            proposer: { name: 'Sam Feldman' }
          }
        ];
        // setFines(sampleData);
        console.log('Fines data from database:', data);
        setFines(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchFines();
  }, []);

  const getTypeColor = (type: string) => {
    console.log('Getting color for type:', type);
    switch (type) {
      case 'Fine': return 'text-red-600 bg-red-50';
      case 'Credit': return 'text-green-600 bg-green-50';
      case 'Warning': return 'text-yellow-600 bg-yellow-50';
      default: 
        console.log('Unknown type for color:', type);
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeEmoji = (type: string) => {
    console.log('Getting emoji for type:', type);
    switch (type) {
      case 'Fine': return '💸';
      case 'Credit': return '💰';
      case 'Warning': return '⚠️';
      default: 
        console.log('Unknown type for emoji:', type);
        return '📝';
    }
  };

  const formatAmount = (amount: number) => {
    return `${(amount / 100).toFixed(2)}`;
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const generateAvatar = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const filteredFines = fines.filter(fine =>
    (fine.subject && typeof fine.subject === 'object' && 'name' in fine.subject && fine.subject.name.toLowerCase().includes(filterPlayer.toLowerCase())) ||
    (fine.proposer && typeof fine.proposer === 'object' && 'name' in fine.proposer && fine.proposer.name.toLowerCase().includes(filterPlayer.toLowerCase()))
  );

  // Group fines by date
  const groupedFines = filteredFines.reduce((groups, fine) => {
    const date = new Date(fine.date).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(fine);
    return groups;
  }, {} as Record<string, FineWithUsersQuery[]>);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading fines...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center text-white font-bold text-sm">
            #
          </div>
          <h1 className="text-lg font-semibold">fines-data</h1>
        </div>
        <input
          type="text"
          placeholder="Filter player..."
          value={filterPlayer}
          onChange={(e) => setFilterPlayer(e.target.value)}
          className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {Object.entries(groupedFines).map(([date, fines]) => (
          <div key={date}>
            {/* Date Divider */}
            <div className="flex items-center justify-center mb-2">
              <div className="bg-white border border-gray-300 rounded-full px-4 py-1 text-sm font-medium text-gray-700 shadow-sm">
                {formatDate(date)}
              </div>
            </div>

            {/* Messages for this date */}
            {fines.map((fine) => {
              const proposerName = fine.proposer && typeof fine.proposer === 'object' && 'name' in fine.proposer ? fine.proposer.name : 'Unknown';
              const subjectName = fine.subject && typeof fine.subject === 'object' && 'name' in fine.subject ? fine.subject.name : 'Unknown';
              
              return (
                <div key={fine.id} className="group hover:bg-gray-50 -mx-4 px-4 py-1 rounded border-b border-gray-300">
                  <div className="flex space-x-3">
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-lg ${getAvatarColor(proposerName)} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
                      {generateAvatar(proposerName)}
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-baseline space-x-2">
                        <span className="font-semibold text-gray-900">{proposerName}</span>
                        <span className="text-xs text-gray-500">{formatTimestamp(fine.date)}</span>
                      </div>

                      {/* Fine Details */}
                      <div className="mt-0.5">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(fine.fine_type)}`}>
                            {getTypeEmoji(fine.fine_type)} {fine.fine_type}
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            ${(fine.amount).toFixed(2)}
                          </span>
                          <span className="text-sm text-gray-600">→</span>
                          <span className="text-sm font-medium text-gray-900">{subjectName}</span>
                        </div>
                        
                        <div className="text-sm text-gray-900 leading-tight">
                          {fine.description}
                        </div>
                      </div>

                      {/* Message Actions */}
                      <div className="flex items-center space-x-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 rounded hover:bg-gray-200 text-gray-500">
                          <Smile size={16} />
                        </button>
                        <button className="p-1 rounded hover:bg-gray-200 text-gray-500">
                          <MessageCircle size={16} />
                        </button>
                        <button className="p-1 rounded hover:bg-gray-200 text-gray-500">
                          <Reply size={16} />
                        </button>
                        <button className="p-1 rounded hover:bg-gray-200 text-gray-500">
                          <Bookmark size={16} />
                        </button>
                        <button className="p-1 rounded hover:bg-gray-200 text-gray-500">
                          <MoreVertical size={16} />
                        </button>
                      </div>

                      {/* Replies indicator */}
                      {fine.replies > 0 && (
                        <div className="mt-1 text-xs text-blue-600 hover:underline cursor-pointer">
                          {fine.replies} {fine.replies === 1 ? 'reply' : 'replies'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="border border-gray-300 rounded-lg p-3 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
          <input
            type="text"
            placeholder="Message #fines-data"
            className="w-full outline-none resize-none text-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default FinesSlackInterface;