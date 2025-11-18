import { useCallback, useEffect, useState } from 'react';
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
import { supabase } from '../../lib/supabaseClient.js';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  available: boolean;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c';

const mapMenuRowToItem = (row: any): MenuItem => ({
  id: row.id,
  name: row.name,
  description: row.description ?? '',
  price: Number(row.price) || 0,
  category: row.category ?? 'Main Course',
  imageUrl: row.image_url || FALLBACK_IMAGE,
  available: row.available ?? true,
});

interface MenuManagementProps {
  cafeteriaId?: string | null;
  cafeteriaName?: string | null;
}

export default function MenuManagement({ cafeteriaId, cafeteriaName }: MenuManagementProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
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

  const hasAssignedCafeteria = Boolean(cafeteriaId);

  const loadMenuItems = useCallback(async () => {
    if (!hasAssignedCafeteria) {
      setMenuItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('cafeteria_id', cafeteriaId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMenuItems((data || []).map(mapMenuRowToItem));
      setHasError(false);
    } catch (error) {
      setHasError(true);
      toast.error('Unable to process requests. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [cafeteriaId, hasAssignedCafeteria]);

  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);

  const filteredItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const validateForm = () => {
    const priceValue = Number(formData.price);
    if (!formData.name.trim() || Number.isNaN(priceValue) || priceValue <= 0) {
      toast.error('Invalid input data. Please check your fields.');
      return false;
    }
    return true;
  };

  const isDuplicateName = (name: string, excludeId?: string) => {
    return menuItems.some(item =>
      item.name.trim().toLowerCase() === name.trim().toLowerCase() &&
      item.id !== excludeId
    );
  };

  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a keyword to search.');
      return;
    }
    if (filteredItems.length === 0) {
      toast.error('No items found for your search.');
    }
  };

  const handleAddItem = async () => {
    if (!hasAssignedCafeteria) {
      toast.error('Please link your cafeteria before adding menu items.');
      return;
    }
    if (!validateForm()) return;
    if (isDuplicateName(formData.name)) {
      toast.error('Item already exists.');
      return;
    }
    const priceValue = Number(formData.price);

    try {
      const { error } = await supabase.from('menu_items').insert({
        cafeteria_id: cafeteriaId,
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: priceValue,
        category: formData.category,
        image_url: formData.imageUrl || FALLBACK_IMAGE,
        available: formData.available,
      });

      if (error) throw error;

      await loadMenuItems();
      toast.success('Menu item added successfully!');
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Unable to process requests. Please try again later.');
    }
  };

  const handleEditItem = async () => {
    if (!hasAssignedCafeteria) {
      toast.error('Please link your cafeteria before updating menu items.');
      return;
    }
    if (!editingItem || !validateForm()) return;
    if (isDuplicateName(formData.name, editingItem.id)) {
      toast.error('Item already exists.');
      return;
    }

    try {
      const priceValue = Number(formData.price);

      const { error } = await supabase
        .from('menu_items')
        .update({
          name: formData.name.trim(),
          description: formData.description.trim(),
          price: priceValue,
          category: formData.category,
          image_url: formData.imageUrl || editingItem.imageUrl,
          available: formData.available,
        })
        .eq('id', editingItem.id)
        .eq('cafeteria_id', cafeteriaId);

      if (error) throw error;

      await loadMenuItems();
      toast.success('Menu item updated successfully!');
      setEditingItem(null);
      resetForm();
    } catch (error) {
      toast.error('Unable to process requests. Please try again later.');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!hasAssignedCafeteria) {
      toast.error('Please link your cafeteria before deleting menu items.');
      return;
    }
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id)
        .eq('cafeteria_id', cafeteriaId);

      if (error) throw error;

      setMenuItems(menuItems.filter(item => item.id !== id));
      toast.success('Menu item deleted successfully!');
    } catch (error) {
      toast.error('Unable to process requests. Please try again later.');
    }
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
              <Label htmlFor="imageUpload">Item Image</Label>
              {formData.imageUrl && (
                <img src={formData.imageUrl} alt="Preview" className="w-full h-40 object-cover rounded-md border" />
              )}
              <Input
                id="imageUpload"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    setFormData({ ...formData, imageUrl: reader.result as string });
                  };
                  reader.readAsDataURL(file);
                }}
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
              <Button
                onClick={handleAddItem}
                className="text-white hover:opacity-90"
                style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }}
                disabled={!hasAssignedCafeteria}
              >
                Add Item
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!hasAssignedCafeteria && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="text-amber-900">
            Your staff profile is not linked to a cafeteria yet. Once an administrator assigns you,
            you can start managing the live menu here.
          </CardContent>
        </Card>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="flex flex-col gap-3 w-full">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button className="w-full sm:w-auto" onClick={handleSearchSubmit}>Search</Button>
            {searchQuery && (
              <Button
                className="w-full sm:w-auto"
                variant="outline"
                onClick={() => setSearchQuery('')}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
        {searchQuery && filteredItems.length === 0 && (
          <p className="text-sm text-slate-500 mt-2">No items found for your search.</p>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading menu items...</div>
      ) : hasError ? (
        <div className="text-center py-12 text-slate-500">Unable to process requests. Please try again later.</div>
      ) : menuItems.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          {hasAssignedCafeteria ? 'No menu items available at the moment.' : 'Awaiting cafeteria assignment.'}
        </div>
      ) : null}

      {/* Menu Items List */}
      <div className="space-y-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-48 h-48 bg-slate-100">
                  <img
                    src={item.imageUrl || '/UTMMunch-Logo.jpg'}
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
                          <div className="space-y-2">
                            <Label htmlFor="edit-image">Item Image</Label>
                            {formData.imageUrl && (
                              <img src={formData.imageUrl} alt="Preview" className="w-full h-40 object-cover rounded-md border" />
                            )}
                            <Input
                              id="edit-image"
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = () => {
                                  setFormData({ ...formData, imageUrl: reader.result as string });
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
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

