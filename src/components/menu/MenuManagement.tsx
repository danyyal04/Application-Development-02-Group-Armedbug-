import { useState } from 'react';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent } from '../ui/card.js';
import { Input } from '../ui/input.js';
import { Button } from '../ui/button.js';
import { Badge } from '../ui/badge.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog.js';
import { Label } from '../ui/label.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.js';
import { toast } from 'sonner';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  available: boolean;
}

const initialMenuItems: MenuItem[] = [
  {
    id: '1',
    name: 'Nasi Lemak',
    description: 'Traditional Malaysian rice dish with sambal, anchovies, peanuts, and egg',
    price: 8.50,
    category: 'Main Course',
    imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398',
    available: true,
  },
  {
    id: '2',
    name: 'Chicken Rice',
    description: 'Tender chicken served with fragrant rice and special sauce',
    price: 10.00,
    category: 'Main Course',
    imageUrl: 'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2',
    available: true,
  },
];

export default function MenuManagement() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Main Course',
    imageUrl: '',
    available: true,
  });

  const filteredItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddItem = () => {
    if (!formData.name || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newItem: MenuItem = {
      id: Date.now().toString(),
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      category: formData.category,
      imageUrl: formData.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
      available: formData.available,
    };

    setMenuItems([...menuItems, newItem]);
    toast.success('Menu item added successfully!');
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleEditItem = () => {
    if (!editingItem || !formData.name || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    setMenuItems(menuItems.map(item =>
      item.id === editingItem.id
        ? {
            ...item,
            name: formData.name,
            description: formData.description,
            price: parseFloat(formData.price),
            category: formData.category,
            imageUrl: formData.imageUrl || item.imageUrl,
            available: formData.available,
          }
        : item
    ));

    toast.success('Menu item updated successfully!');
    setEditingItem(null);
    resetForm();
  };

  const handleDeleteItem = (id: string) => {
    setMenuItems(menuItems.filter(item => item.id !== id));
    toast.success('Menu item deleted successfully!');
  };

  const openEditDialog = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      imageUrl: item.imageUrl,
      available: item.available,
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'Main Course',
      imageUrl: '',
      available: true,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 mb-2">Manage Menu 🍽️</h1>
          <p className="text-slate-600">Add, edit, or remove menu items</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="text-white hover:opacity-90" style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }}>
              <Plus className="w-4 h-4 mr-2" />
              Add New Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Menu Item</DialogTitle>
              <DialogDescription>Fill in the details to add a new item to your menu</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Item Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Nasi Lemak"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your dish..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (RM) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Main Course">Main Course</SelectItem>
                      <SelectItem value="Beverages">Beverages</SelectItem>
                      <SelectItem value="Snacks">Snacks</SelectItem>
                      <SelectItem value="Desserts">Desserts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL (optional)</Label>
                <Input
                  id="imageUrl"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="available">Available</Label>
                <input
                  id="available"
                  type="checkbox"
                  checked={formData.available}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, available: e.target.checked })}
                  className="h-4 w-4"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleAddItem} className="text-white hover:opacity-90" style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }}>
                Add Item
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Menu Items List */}
      <div className="space-y-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-48 h-48 bg-slate-100">
                  <img
                    src="/UTMMunch-Logo.jpg"
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 p-6">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-slate-900">{item.name}</h3>
                        <Badge variant={item.available ? 'default' : 'secondary'}>
                          {item.available ? 'Available' : 'Unavailable'}
                        </Badge>
                        <Badge variant="outline">{item.category}</Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{item.description}</p>
                      <p className="text-purple-700">RM {item.price.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Dialog open={editingItem?.id === item.id} onOpenChange={(open) => !open && setEditingItem(null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(item)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Edit Menu Item</DialogTitle>
                          <DialogDescription>Update the details of this menu item</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-name">Item Name *</Label>
                            <Input
                              id="edit-name"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <textarea
                              id="edit-description"
                              value={formData.description}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                              rows={3}
                              className="w-full px-3 py-2 border border-slate-300 rounded-md"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-price">Price (RM) *</Label>
                              <Input
                                id="edit-price"
                                type="number"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-category">Category</Label>
                              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Main Course">Main Course</SelectItem>
                                  <SelectItem value="Beverages">Beverages</SelectItem>
                                  <SelectItem value="Snacks">Snacks</SelectItem>
                                  <SelectItem value="Desserts">Desserts</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="edit-available">Available</Label>
                            <input
                              id="edit-available"
                              type="checkbox"
                              checked={formData.available}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, available: e.target.checked })}
                              className="h-4 w-4"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => { setEditingItem(null); resetForm(); }}>
                            Cancel
                          </Button>
                          <Button onClick={handleEditItem} className="text-white hover:opacity-90" style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }}>
                            Save Changes
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
