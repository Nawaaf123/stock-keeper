import { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  onAddNew: (name: string) => Promise<void>;
  placeholder: string;
  label: string;
}

export function CategoryCombobox({ value, onChange, options, onAddNew, placeholder, label }: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    setAdding(true);
    await onAddNew(newValue.trim());
    onChange(newValue.trim());
    setNewValue('');
    setAdding(false);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-10"
        >
          {value || <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="max-h-[200px] overflow-y-auto">
          {options.map((option) => (
            <button
              key={option}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent cursor-pointer",
                value === option && "bg-accent"
              )}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              <Check className={cn("h-4 w-4", value === option ? "opacity-100" : "opacity-0")} />
              {option}
            </button>
          ))}
          {options.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">No {label.toLowerCase()}s yet</p>
          )}
        </div>
        <div className="border-t p-2 flex gap-2">
          <Input
            placeholder={`New ${label.toLowerCase()}...`}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button size="sm" className="h-8 px-2" onClick={handleAdd} disabled={!newValue.trim() || adding}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
