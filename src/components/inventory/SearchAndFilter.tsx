import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Warehouse } from '@/types/inventory';

interface SearchAndFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  subCategoryFilter: string;
  onSubCategoryChange: (value: string) => void;
  categories: string[];
  subCategories: string[];
  warehouseFilter: string;
  onWarehouseChange: (value: string) => void;
  warehouses: Warehouse[];
}

export function SearchAndFilter({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  subCategoryFilter,
  onSubCategoryChange,
  categories,
  subCategories,
  warehouseFilter,
  onWarehouseChange,
  warehouses,
}: SearchAndFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or SKU..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <Select value={categoryFilter} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={subCategoryFilter} onValueChange={onSubCategoryChange}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="All Subcategories" />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="all">All Subcategories</SelectItem>
          {subCategories.map((subCat) => (
            <SelectItem key={subCat} value={subCat}>
              {subCat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={warehouseFilter} onValueChange={onWarehouseChange}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="All Warehouses" />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="all">All Warehouses</SelectItem>
          {warehouses.map((wh) => (
            <SelectItem key={wh.id} value={wh.id}>
              {wh.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
