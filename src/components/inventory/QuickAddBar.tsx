import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CategoryCombobox } from './CategoryCombobox';
import { supabase } from '@/integrations/supabase/client';
import { InventoryItem } from '@/types/inventory';
import { toast } from 'sonner';

interface QuickAddBarProps {
  onAddItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated' | 'stock'>) => Promise<void> | void;
}

export function QuickAddBar({ onAddItem }: QuickAddBarProps) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [subCategories, setSubCategories] = useState<{ id: string; name: string; category_id: string }[]>([]);
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [minStock, setMinStock] = useState('');
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    const [{ data: cats }, { data: subs }] = await Promise.all([
      supabase.from('categories').select('id, name').order('name'),
      supabase.from('sub_categories').select('id, name, category_id').order('name'),
    ]);
    if (cats) setCategories(cats);
    if (subs) setSubCategories(subs);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const selectedCatId = categories.find(c => c.name === category)?.id;
  const filteredSubs = selectedCatId
    ? subCategories.filter(sc => sc.category_id === selectedCatId).map(sc => sc.name)
    : [];

  const handleAddCategory = async (newName: string) => {
    const { data } = await supabase.from('categories').insert({ name: newName }).select().single();
    if (data) setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleAddSubCategory = async (newName: string) => {
    if (!selectedCatId) return;
    const { data } = await supabase.from('sub_categories').insert({ name: newName, category_id: selectedCatId }).select().single();
    if (data) setSubCategories(prev => [...prev, data]);
  };

  const handleCategoryChange = (v: string) => {
    setCategory(v);
    setSubCategory('');
  };

  const submit = async () => {
    if (!name.trim() || !sku.trim()) {
      toast.error('Name and SKU are required');
      return;
    }
    if (!category) {
      toast.error('Select a category');
      return;
    }
    setSaving(true);
    try {
      await onAddItem({
        name: name.trim(),
        sku: sku.trim(),
        category,
        subCategory,
        minStock: parseInt(minStock) || 0,
        price: parseFloat(price) || 0,
      });
      setName('');
      setSku('');
      setTimeout(() => nameRef.current?.focus(), 30);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="bg-card border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-primary" />
          Quick Add
        </Label>
        <span className="text-xs text-muted-foreground">
          Press Enter to add. Category stays selected for fast entry.
        </span>
      </div>
      <div className="grid grid-cols-12 gap-2" onKeyDown={onKeyDown}>
        <div className="col-span-12 sm:col-span-2">
          <CategoryCombobox
            value={category}
            onChange={handleCategoryChange}
            options={categories.map(c => c.name)}
            onAddNew={handleAddCategory}
            placeholder="Category"
            label="Category"
          />
        </div>
        <div className="col-span-12 sm:col-span-2">
          <CategoryCombobox
            value={subCategory}
            onChange={setSubCategory}
            options={filteredSubs}
            onAddNew={handleAddSubCategory}
            placeholder={category ? 'Sub-category' : 'Pick category'}
            label="Sub Category"
          />
        </div>
        <Input
          ref={nameRef}
          className="col-span-12 sm:col-span-3"
          placeholder="Product name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          className="col-span-6 sm:col-span-2"
          placeholder="SKU"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
        />
        <Input
          className="col-span-3 sm:col-span-1"
          type="number"
          min="0"
          step="0.01"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <Input
          className="col-span-3 sm:col-span-1"
          type="number"
          min="0"
          placeholder="Min"
          value={minStock}
          onChange={(e) => setMinStock(e.target.value)}
        />
        <Button
          type="button"
          onClick={submit}
          disabled={saving}
          className="col-span-12 sm:col-span-1 gap-1"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add
        </Button>
      </div>
    </div>
  );
}
