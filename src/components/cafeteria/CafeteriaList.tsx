import { useState } from 'react';
import { Search, Star, MapPin, Clock, Filter } from 'lucide-react';
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

interface Cafeteria {
  id: string;
  name: string;
  location: string;
  description: string;
  image: string;
  rating: number;
  estimatedTime: string;
  isOpen: boolean;
  category: string;
}

const allCafeterias: Cafeteria[] = [
  {
    id: '1',
    name: 'Cafe Angkasa',
    location: 'Faculty of Engineering',
    description: 'Popular for Nasi Lemak and local delights',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5',
    rating: 4.5,
    estimatedTime: '15-20 min',
    isOpen: true,
    category: 'Malaysian',
  },
  {
    id: '2',
    name: 'Cafe Siswa',
    location: 'Kolej Tun Dr. Ismail',
    description: 'Western and Asian fusion cuisine',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
    rating: 4.3,
    estimatedTime: '10-15 min',
    isOpen: true,
    category: 'Western',
  },
  {
    id: '3',
    name: 'Cafe Budaya',
    location: 'Faculty of Management',
    description: 'Best chicken rice and drinks on campus',
    image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9',
    rating: 4.7,
    estimatedTime: '12-18 min',
    isOpen: true,
    category: 'Malaysian',
  },
  {
    id: '4',
    name: 'Cafe Perdana',
    location: 'Kolej Tun Razak',
    description: 'Variety of noodles and rice dishes',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
    rating: 4.2,
    estimatedTime: '15-25 min',
    isOpen: true,
    category: 'Asian',
  },
  {
    id: '5',
    name: 'Cafe Cendekia',
    location: 'Faculty of Science',
    description: 'Healthy options and vegetarian meals',
    image: 'https://images.unsplash.com/photo-1533777324565-a040eb52facd',
    rating: 4.4,
    estimatedTime: '10-12 min',
    isOpen: false,
    category: 'Healthy',
  },
  {
    id: '6',
    name: 'Cafe Dato Onn',
    location: 'Kolej Dato Onn Jaafar',
    description: 'Famous for breakfast and supper',
    image: 'https://images.unsplash.com/photo-1551218808-94e220e084d2',
    rating: 4.6,
    estimatedTime: '8-15 min',
    isOpen: true,
    category: 'Malaysian',
  },
];

interface CafeteriaListProps {
  onSelectCafeteria: (cafeteria: Cafeteria) => void;
}

export default function CafeteriaList({ onSelectCafeteria }: CafeteriaListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredCafeterias = allCafeterias.filter(cafeteria => {
    const matchesSearch = 
      cafeteria.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cafeteria.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cafeteria.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || cafeteria.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'open' && cafeteria.isOpen) ||
      (filterStatus === 'closed' && !cafeteria.isOpen);

    return matchesSearch && matchesCategory && matchesStatus;
  });

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
            placeholder="Search cafeterias, locations, or food..."
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
          Showing {filteredCafeterias.length} of {allCafeterias.length} cafeterias
        </p>
      </div>

      {/* Cafeteria Grid */}
      {filteredCafeterias.length === 0 ? (
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
                  className={`absolute top-3 right-3 ${
                    cafeteria.isOpen 
                      ? 'bg-green-600' 
                      : 'bg-slate-600'
                  }`}
                >
                  {cafeteria.isOpen ? 'Open Now' : 'Closed'}
                </Badge>
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
