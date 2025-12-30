import { useState, useEffect } from 'react';
import { Star, MessageSquare, Calendar, Filter, TrendingUp, AlertCircle, Send, X, Pencil } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';

interface Feedback {
  id: string;
  customerName: string;
  customerEmail: string;
  rating: number;
  comment: string;
  date: string;
  time: string;
  orderItems: string[];
  hasReply: boolean;
  photoUrl?: string | null;
  reply: {
    text: string;
    date: string;
    time: string;
  } | undefined;
}

export default function FeedbackDashboard() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [filterRating, setFilterRating] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingReply, setEditingReply] = useState<string | null>(null);

  // Load feedback from database
  const loadFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform database data to match Feedback interface
      const transformedFeedback: Feedback[] = (data || []).map((item: any) => {
        const createdAt = new Date(item.created_at);
        const replyDate = item.reply_date ? new Date(item.reply_date) : null;

        return {
          id: item.id,
          customerName: item.customer_name,
          customerEmail: item.customer_email,
          rating: item.rating,
          comment: item.comment,
          date: createdAt.toISOString().split('T')[0] || '',
          time: createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) || '',
          orderItems: Array.isArray(item.order_items) 
            ? item.order_items.map((i: any) => i.name || 'Item')
            : [],
          hasReply: item.has_reply || false,
          photoUrl: item.photo_url,
          reply: item.has_reply && item.reply_text && replyDate ? {
            text: item.reply_text,
            date: replyDate.toISOString().split('T')[0] || '',
            time: replyDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) || '',
          } : undefined,
        };
      });

      setFeedbackList(transformedFeedback);
    } catch (error) {
      console.error('Error loading feedback:', error);
      toast.error('Failed to load feedback');
    } finally {
      setIsLoading(false);
    }
  };

  // Load feedback on mount and subscribe to changes
  useEffect(() => {
    loadFeedback();

    // Subscribe to real-time feedback updates
    const channel = supabase
      .channel('feedback-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feedback' },
        () => loadFeedback()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // UC033 - NF: Calculate overall average rating
  const calculateAverageRating = (): string => {
    if (feedbackList.length === 0) return '0';
    const sum = feedbackList.reduce((acc, feedback) => acc + feedback.rating, 0);
    return (sum / feedbackList.length).toFixed(1);
  };

  // UC033 - NF: Filter by rating
  const filterByRating = (feedback: Feedback[]) => {
    if (filterRating === 'all') return feedback;
    const rating = parseInt(filterRating);
    return feedback.filter(f => f.rating === rating);
  };

  // UC033 - NF: Filter by date
  const filterByDate = (feedback: Feedback[]) => {
    if (filterDate === 'all') return feedback;
    const today = new Date();
    
    if (filterDate === 'today') {
      return feedback.filter(f => f.date === today.toISOString().split('T')[0]);
    } else if (filterDate === 'week') {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return feedback.filter(f => new Date(f.date) >= weekAgo);
    } else if (filterDate === 'month') {
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      return feedback.filter(f => new Date(f.date) >= monthAgo);
    }
    
    return feedback;
  };

  // Apply all filters
  const filteredFeedback = filterByDate(filterByRating(feedbackList));

  // UC034 - NF: Handle reply submission
  const handlePostReply = async (feedbackId: string) => {
    if (!replyText.trim()) {
      toast.error('Please enter a reply message');
      return;
    }

    try {
      const now = new Date();

      // Update feedback in database
      const { error } = await supabase
        .from('feedback')
        .update({
          has_reply: true,
          reply_text: replyText.trim(),
          reply_date: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', feedbackId);

      if (error) throw error;

      // Update local state
      const updatedFeedback = feedbackList.map(f => {
        if (f.id === feedbackId) {
          return {
            ...f,
            hasReply: true,
            reply: {
              text: replyText,
              date: now.toISOString().split('T')[0] || '',
              time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) || '',
            },
          };
        }
        return f;
      });

      setFeedbackList(updatedFeedback);
      setReplyingTo(null);
      setReplyText('');
      setEditingReply(null); // Exit edit mode
      
      // UC034 - NF: Confirmation message
      toast.success('Reply posted successfully', {
        description: 'Your response is now visible to the customer',
      });
    } catch (error) {
      console.error('Error posting reply:', error);
      toast.error('Failed to post reply', {
        description: 'Please try again later',
      });
    }
  };

  // UC034 - AF1: Handle cancel reply
  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyText('');
    setEditingReply(null);
  };

  // Handle edit reply
  const handleEditReply = (feedbackId: string, currentReplyText: string) => {
    setEditingReply(feedbackId);
    setReplyText(currentReplyText);
  };

  // Render star rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
            }`}
          />
        ))}
      </div>
    );
  };

  // Get rating badge color
  const getRatingBadgeColor = (rating: number) => {
    if (rating >= 4) return 'bg-green-100 text-green-700';
    if (rating === 3) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="py-8">
        <Card className="text-center py-16">
          <CardContent>
            <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-slate-900 mb-2">Loading feedback...</h3>
            <p className="text-slate-600">Please wait while we fetch customer reviews</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // UC033 - AF1: No feedback available
  if (feedbackList.length === 0) {
    return (
      <div className="py-8">
        <Card className="text-center py-16">
          <CardContent>
            <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-slate-900 mb-2">No customer feedback yet</h3>
            <p className="text-slate-600">
              Feedback will appear here once customers start reviewing your cafeteria
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>


      {/* UC033 - NF: Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-slate-200 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-slate-600">Average Rating</CardTitle>
            <Star className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-slate-900">{calculateAverageRating()}</span>
              <span className="text-sm text-slate-500">out of 5.0</span>
            </div>
            <div className="flex gap-0.5 mt-2">
              {renderStars(Math.round(parseFloat(calculateAverageRating())))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-slate-600">Total Feedback</CardTitle>
            <MessageSquare className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-slate-900">{feedbackList.length}</div>
            <p className="text-xs text-slate-500 mt-1">Customer reviews</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-slate-600">Pending Replies</CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-slate-900">
              {feedbackList.filter(f => !f.hasReply).length}
            </div>
            <p className="text-xs text-slate-500 mt-1">Need response</p>
          </CardContent>
        </Card>
      </div>

      {/* UC033 - NF: Filter Options */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter feedback by rating or date</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600 mb-2 block">Filter by Rating</label>
              <Select value={filterRating} onValueChange={setFilterRating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="1">1 Star</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-slate-600 mb-2 block">Filter by Date</label>
              <Select value={filterDate} onValueChange={setFilterDate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(filterRating !== 'all' || filterDate !== 'all') && (
            <div className="mt-4">
              <p className="text-sm text-slate-600">
                Showing {filteredFeedback.length} of {feedbackList.length} reviews
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* UC033 - NF: Feedback List */}
      <div className="space-y-4">
        {filteredFeedback.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No feedback matches your current filters</p>
            </CardContent>
          </Card>
        ) : (
          filteredFeedback.map((feedback) => (
            <Card key={feedback.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                {/* Feedback Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-slate-900">{feedback.customerName}</h3>
                      <Badge className={getRatingBadgeColor(feedback.rating)}>
                        {feedback.rating} ★
                      </Badge>
                      {feedback.hasReply && (
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          Replied
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {feedback.date} at {feedback.time}
                      </span>
                    </div>
                  </div>
                  {renderStars(feedback.rating)}
                </div>

                {/* Order Items */}
                <div className="mb-3">
                  <p className="text-xs text-slate-500 mb-1">Ordered:</p>
                  <div className="flex gap-2 flex-wrap">
                    {feedback.orderItems.map((item, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Customer Comment */}
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <p className="text-slate-700">{feedback.comment}</p>
                </div>

                {/* Owner Reply (if exists) */}
                {feedback.hasReply && feedback.reply && (
                  <div className="bg-purple-50 border-l-4 border-purple-600 rounded-lg p-4 mb-4">
                    {editingReply === feedback.id ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4 text-purple-600" />
                          <span className="text-sm text-purple-900">Edit Your Reply</span>
                        </div>
                        <Textarea
                          placeholder="Update your response..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="min-h-[100px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handlePostReply(feedback.id)}
                            className="bg-purple-800 hover:bg-purple-900"
                            size="sm"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Update Reply
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleCancelReply}
                            size="sm"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-purple-600" />
                            <span className="text-sm text-purple-900">Your Reply</span>
                            <span className="text-xs text-purple-600">
                              {feedback.reply.date} at {feedback.reply.time}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditReply(feedback.id, feedback.reply?.text || '')}
                            className="h-8 w-8 p-0 text-purple-600 hover:text-purple-800 hover:bg-purple-100"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-slate-700">{feedback.reply.text}</p>
                      </>
                    )}
                  </div>
                )}

                {/* UC034 - NF: Reply Section */}
                {!feedback.hasReply && (
                  <>
                    {replyingTo === feedback.id ? (
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Write your response to the customer..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="min-h-[100px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handlePostReply(feedback.id)}
                            className="bg-purple-800 hover:bg-purple-900"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Post Reply
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleCancelReply}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setReplyingTo(feedback.id)}
                        className="w-full"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Reply to Customer
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
