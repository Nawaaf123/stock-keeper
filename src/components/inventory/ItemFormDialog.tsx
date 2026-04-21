import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { InventoryItem, Warehouse } from '@/types/inventory';
import { CategoryCombobox } from './CategoryCombobox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItem | null;
  warehouses: Warehouse[];
  onSubmit: (item: Omit<InventoryItem, 'id' | 'lastUpdated' | 'stock'> & { initialStock?: { warehouseId: string; quantity: number }[] }) => void;
  onUpdate: (id: string, updates: Partial<Omit<InventoryItem, 'stock'>>) => void;
}

const initialFormState = {
  name: '',
  sku: '',
  category: '',
  subCategory: '',
  minStock: 0,
  price: 0,
};

export function ItemFormDialog({ open, onOpenChange, item, warehouses, onSubmit, onUpdate }: ItemFormDialogProps) {
  const [formData, setFormData] = useState(initialFormState);
  const [initialStock, setInitialStock] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [subCategories, setSubCategories] = useState<{ id: string; name: string; category_id: string }[]>([]);
  const [aiDescription, setAiDescription] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const handleSmartFill = async () => {
    if (!aiDescription.trim()) {
      toast.error('Paste a product description first');
      return;
    }
    setAiLoading(true);
    try {
      const existingSubCats = subCategories.map(sc => ({
        name: sc.name,
        category: categories.find(c => c.id === sc.category_id)?.name || '',
      }));
      const { data, error } = await supabase.functions.invoke('smart-product-fill', {
        body: {
          description: aiDescription,
          existingCategories: categories.map(c => c.name),
          existingSubCategories: existingSubCats,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Auto-create the category if it doesn't exist yet
      let categoryName = data.category || '';
      if (categoryName && !categories.some(c => c.name.toLowerCase() === categoryName.toLowerCase())) {
        const { data: newCat } = await supabase.from('categories').insert({ name: categoryName }).select().single();
        if (newCat) {
          setCategories(prev => [...prev, { id: newCat.id, name: newCat.name }].sort((a, b) => a.name.localeCompare(b.name)));
          categoryName = newCat.name;
        }
      } else {
        const match = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
        if (match) categoryName = match.name;
      }

      // Auto-create subcategory under that category if needed
      let subCategoryName = data.subCategory || '';
      if (subCategoryName && categoryName) {
        const catId = categories.find(c => c.name === categoryName)?.id
          || (await supabase.from('categories').select('id').eq('name', categoryName).maybeSingle()).data?.id;
        if (catId) {
          const exists = subCategories.some(
            sc => sc.category_id === catId && sc.name.toLowerCase() === subCategoryName.toLowerCase()
          );
          if (!exists) {
            const { data: newSub } = await supabase
              .from('sub_categories')
              .insert({ name: subCategoryName, category_id: catId })
              .select()
              .single();
            if (newSub) {
              setSubCategories(prev => [...prev, { id: newSub.id, name: newSub.name, category_id: newSub.category_id }]);
              subCategoryName = newSub.name;
            }
          }
        }
      }

      setFormData(prev => ({
        ...prev,
        name: data.name || prev.name,
        sku: data.sku || prev.sku,
        category: categoryName || prev.category,
        subCategory: subCategoryName || prev.subCategory,
        price: typeof data.price === 'number' && data.price > 0 ? data.price : prev.price,
      }));
      toast.success('Form filled by AI');
    } catch (err: any) {
      toast.error(err?.message || 'AI smart fill failed');
    } finally {
      setAiLoading(false);
    }
  };

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('id, name').order('name');
    if (data) setCategories(data);
  }, []);

  const fetchSubCategories = useCallback(async () => {
    const { data } = await supabase.from('sub_categories').select('id, name, category_id').order('name');
    if (data) setSubCategories(data);
  }, []);

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchSubCategories();
    }
  }, [open, fetchCategories, fetchSubCategories]);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        sku: item.sku,
        category: item.category,
        subCategory: item.subCategory || '',
        minStock: item.minStock,
        price: item.price,
      });
    } else {
      setFormData(initialFormState);
      setInitialStock({});
    }
  }, [item, open]);

  const selectedCategoryId = categories.find(c => c.name === formData.category)?.id;
  const filteredSubCategories = selectedCategoryId
    ? subCategories.filter(sc => sc.category_id === selectedCategoryId).map(sc => sc.name)
    : [];

  const handleAddCategory = async (name: string) => {
    const { data } = await supabase.from('categories').insert({ name }).select().single();
    if (data) {
      setCategories(prev => [...prev, { id: data.id, name: data.name }].sort((a, b) => a.name.localeCompare(b.name)));
    }
  };

  const handleAddSubCategory = async (name: string) => {
    if (!selectedCategoryId) return;
    const { data } = await supabase.from('sub_categories').insert({ name, category_id: selectedCategoryId }).select().single();
    if (data) {
      setSubCategories(prev => [...prev, { id: data.id, name: data.name, category_id: data.category_id }]);
    }
  };

  const handleCategoryChange = (value: string) => {
    setFormData({ ...formData, category: value, subCategory: '' });
  };

  const submitForm = async (keepOpen: boolean) => {
    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }
    if (item) {
      await onUpdate(item.id, formData);
      onOpenChange(false);
      return;
    }
    const stockData = Object.entries(initialStock)
      .filter(([_, qty]) => qty > 0)
      .map(([warehouseId, quantity]) => ({ warehouseId, quantity }));
    await onSubmit({ ...formData, initialStock: stockData });

    if (keepOpen) {
      // Keep category/subCategory/minStock for fast repeat entry; clear product-specific fields
      setFormData(prev => ({
        ...prev,
        name: '',
        sku: '',
        price: 0,
      }));
      setInitialStock({});
      setAiDescription('');
      // Focus the name field for the next item
      setTimeout(() => {
        const el = document.getElementById('name') as HTMLInputElement | null;
        el?.focus();
      }, 50);
    } else {
      onOpenChange(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitForm(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Item' : 'Add New Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {!item && (
            <div className="space-y-2 p-3 rounded-md border border-dashed border-primary/40 bg-primary/5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Smart fill with AI
              </Label>
              <Textarea
                placeholder="Paste a product description, supplier line, or rough notes..."
                value={aiDescription}
                onChange={(e) => setAiDescription(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleSmartFill}
                disabled={aiLoading}
                className="gap-2"
              >
                {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {aiLoading ? 'Filling...' : 'Auto-fill fields'}
              </Button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Category</Label>
              <CategoryCombobox
                value={formData.category}
                onChange={handleCategoryChange}
                options={categories.map(c => c.name)}
                onAddNew={handleAddCategory}
                placeholder="Select category"
                label="Category"
              />
            </div>
            <div>
              <Label>Sub Category</Label>
              <CategoryCombobox
                value={formData.subCategory}
                onChange={(v) => setFormData({ ...formData, subCategory: v })}
                options={filteredSubCategories}
                onAddNew={handleAddSubCategory}
                placeholder={formData.category ? "Select sub-category" : "Select category first"}
                label="Sub Category"
              />
            </div>
            <div>
              <Label htmlFor="minStock">Min Stock Level</Label>
              <Input
                id="minStock"
                type="number"
                min="0"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
            <div>
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
          </div>

          {!item && (
            <div className="space-y-3 pt-4 border-t border-border">
              <Label className="text-sm font-medium">Initial Stock (Optional)</Label>
              <div className="grid grid-cols-2 gap-3">
                {warehouses.map((wh) => (
                  <div key={wh.id} className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground min-w-20">{wh.name}</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={initialStock[wh.id] || ''}
                      onChange={(e) => setInitialStock({ ...initialStock, [wh.id]: parseInt(e.target.value) || 0 })}
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {!item && (
              <Button type="button" variant="secondary" onClick={() => submitForm(true)}>
                Save & add another
              </Button>
            )}
            <Button type="submit">{item ? 'Save Changes' : 'Add Item'}</Button>
          </div>
          {!item && formData.category && (
            <p className="text-xs text-muted-foreground text-right">
              Tip: "Save & add another" keeps <span className="font-medium text-foreground">{formData.category}</span>
              {formData.subCategory && <> / <span className="font-medium text-foreground">{formData.subCategory}</span></>} selected.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
