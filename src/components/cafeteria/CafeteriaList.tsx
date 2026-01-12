import { useEffect, useMemo, useState } from 'react';
import { Search, Star, MapPin, Clock, Filter, Heart } from 'lucide-react';
import { Card, CardContent } from '../ui/card.js';
import { Input } from '../ui/input.js';
import { Button } from '../ui/button.js';
import { Badge } from '../ui/badge.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select.js';
import { supabase } from '../../lib/supabaseClient.js';
import { toast } from 'sonner';

interface Cafeteria {
  id: string;
  name: string;
  location: string;
  description: string;
  image: string;
  shopImageUrl?: string | null;
  rating: number;
  estimatedTime: string;
  isOpen: boolean;
  category: string;
}

interface CafeteriaListProps {
  onSelectCafeteria: (cafeteria: Cafeteria) => void;
}

const DEFAULT_CAFETERIAS: Cafeteria[] = [
  {
    id: 'default-cafe-1',
    name: 'UTM Cafeteria',
    location: 'UTM',
    description: 'Default cafeteria listing.',
    image: '/UTMMunch-Logo.jpg',
    shopImageUrl: '/UTMMunch-Logo.jpg',
    rating: 4.5,
    estimatedTime: '15-20 min',
    isOpen: true,
    category: 'Malaysian',
  },
];

export default function CafeteriaList({ onSelectCafeteria }: CafeteriaListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [cafeterias, setCafeterias] = useState<Cafeteria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fetchCafeterias = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('cafeterias')
        .select('*')
        .order('name', { ascending: true });

      setHasError(false);

      const mapped =
        (data || []).map(row => ({
          id: row.id,
          name: row.name,
          location: row.location ?? 'UTM',
          description: row.description ?? '',
          shopImageUrl: row.shop_image_url || row.image || null,
          image: row.shop_image_url || row.image || '/UTMMunch-Logo.jpg',
          rating: row.rating ?? 4.5,
          estimatedTime: row.estimated_time ?? '15-20 min',
          isOpen: row.is_open ?? true,
          category: row.category ?? 'Malaysian',
        })) || [];

      if (!error && mapped.length > 0) {
        setCafeterias(mapped);
      } else {
        // If error OR no rows, show defaults so the page isn't empty
        setCafeterias(DEFAULT_CAFETERIAS);
      }
      setIsLoading(false);
    };

    fetchCafeterias();
  }, []);

  // Use a Set for faster lookups, but store as array in state for easier JSON serialization
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('favouriteCafeterias');
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load favorites", e);
    }
  }, []);

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    // Calculate new favorites based on current state (favorites is available in closure)
    const newFavorites = favorites.includes(id) 
      ? favorites.filter(fId => fId !== id) 
      : [...favorites, id];
    
    // Update State
    setFavorites(newFavorites);
    
    // Perform Side Effects
    localStorage.setItem('favouriteCafeterias', JSON.stringify(newFavorites));
    window.dispatchEvent(new Event('storage'));

    if (newFavorites.includes(id)) {
      toast.success("Cafeteria marked as favourite");
    } else {
      toast.info("Cafeteria removed from favourites");
    }
  };

  const filteredCafeterias = useMemo(() => {
    return cafeterias.filter(cafeteria => {
      const matchesSearch = 
        cafeteria.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = filterCategory === 'all' || cafeteria.category === filterCategory;
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'open' && cafeteria.isOpen) ||
        (filterStatus === 'closed' && !cafeteria.isOpen);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [cafeterias, searchQuery, filterCategory, filterStatus]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-slate-900 mb-2">All Cafeterias 🏫</h1>
        <p className="text-slate-600">Browse and pre-order from UTM cafeterias</p>
      </div>

      {/* Search and Filter */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Search cafeterias by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-600" />
            <span className="text-sm text-slate-600">Filters:</span>
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Malaysian">Malaysian</SelectItem>
              <SelectItem value="Western">Western</SelectItem>
              <SelectItem value="Asian">Asian</SelectItem>
              <SelectItem value="Healthy">Healthy</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open Now</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || filterCategory !== 'all' || filterStatus !== 'all') && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setFilterCategory('all');
                setFilterStatus('all');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-sm text-slate-600">
          {isLoading
            ? 'Loading cafeterias...'
            : `Showing ${filteredCafeterias.length} of ${cafeterias.length} cafeterias`}
        </p>
      </div>

      {/* Cafeteria Grid */}
      {hasError ? (
        <Card>
          <CardContent className="py-12 text-center text-red-600">
            Unable to load cafeterias. Please try again later.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            Loading cafeterias...
          </CardContent>
        </Card>
      ) : filteredCafeterias.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">No cafeterias found matching your criteria.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCafeterias.map((cafeteria) => (
            <Card 
              key={cafeteria.id} 
              className="overflow-hidden hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1"
              onClick={() => onSelectCafeteria(cafeteria)}
            >
              <div className="aspect-video w-full overflow-hidden bg-slate-100 relative">
                <img
                  src={cafeteria.image || '/UTMMunch-Logo.jpg'}
                  alt={cafeteria.name}
                  className="w-full h-full object-cover"
                />
                 <Badge 
                  className={`absolute top-3 left-3 ${
                    cafeteria.isOpen 
                      ? 'bg-green-600' 
                      : 'bg-slate-600'
                  }`}
                >
                  {cafeteria.isOpen ? 'Open Now' : 'Closed'}
                </Badge>
                <div 
                  className="absolute top-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors shadow-sm cursor-pointer z-10"
                  onClick={(e) => toggleFavorite(e, cafeteria.id)}
                >
                  <Heart 
                    className={`w-5 h-5 transition-colors ${
                      favorites.includes(cafeteria.id) 
                        ? 'fill-red-500 text-red-500' 
                        : 'text-slate-400 hover:text-red-500'
                    }`} 
                  />
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-slate-900 mb-1">{cafeteria.name}</h3>
                    <div className="flex items-center gap-1 text-amber-500 mb-2">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm text-slate-900">{cafeteria.rating}</span>
                      <Badge variant="outline" className="ml-2">{cafeteria.category}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-slate-600 mb-2">
                  <MapPin className="w-4 h-4" />
                  <p className="text-sm">{cafeteria.location}</p>
                </div>
                <p className="text-sm text-slate-600 mb-3">{cafeteria.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">{cafeteria.estimatedTime}</span>
                  </div>
                  <Button 
                    size="sm" 
                    className="text-white hover:opacity-90"
                    style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }}
                    disabled={!cafeteria.isOpen}
                  >
                    {cafeteria.isOpen ? 'View Menu' : 'Closed'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
