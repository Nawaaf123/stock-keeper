import { useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Upload, Search, Users2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Wholesaler } from '@/types/inventory';
import { toast } from 'sonner';

interface WholesalersViewProps {
  wholesalers: Wholesaler[];
  onAddWholesaler: (wholesaler: Omit<Wholesaler, 'id'>) => void;
  onUpdateWholesaler: (id: string, updates: Partial<Omit<Wholesaler, 'id'>>) => void;
  onDeleteWholesaler: (id: string) => void;
}

export function WholesalersView({
  wholesalers,
  onAddWholesaler,
  onUpdateWholesaler,
  onDeleteWholesaler,
}: WholesalersViewProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingWholesaler, setEditingWholesaler] = useState<Wholesaler | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredWholesalers = wholesalers.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.phone.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          toast.error('CSV file must have a header row and at least one data row');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const requiredHeaders = ['name'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
          toast.error(`Missing required columns: ${missingHeaders.join(', ')}`);
          return;
        }

        let importedCount = 0;
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length < 1) continue;

          const wholesaler: Omit<Wholesaler, 'id'> = {
            name: values[headers.indexOf('name')] || '',
            contactPerson: headers.includes('contactperson') ? values[headers.indexOf('contactperson')] || '' : '',
            phone: headers.includes('phone') ? values[headers.indexOf('phone')] || '' : '',
            email: headers.includes('email') ? values[headers.indexOf('email')] || '' : '',
            address: headers.includes('address') ? values[headers.indexOf('address')] || '' : '',
          };

          if (wholesaler.name) {
            onAddWholesaler(wholesaler);
            importedCount++;
          }
        }

        toast.success(`Successfully imported ${importedCount} wholesalers`);
      } catch (error) {
        toast.error('Failed to parse CSV file');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleAdd = () => {
    if (formData.name.trim()) {
      onAddWholesaler(formData);
      resetForm();
      setIsAddDialogOpen(false);
    }
  };

  const handleEdit = (wholesaler: Wholesaler) => {
    setEditingWholesaler(wholesaler);
    setFormData({
      name: wholesaler.name,
      contactPerson: wholesaler.contactPerson,
      phone: wholesaler.phone,
      email: wholesaler.email,
      address: wholesaler.address,
    });
  };

  const handleUpdate = () => {
    if (editingWholesaler && formData.name.trim()) {
      onUpdateWholesaler(editingWholesaler.id, formData);
      setEditingWholesaler(null);
      resetForm();
    }
  };

  const handleDelete = (id: string) => {
    onDeleteWholesaler(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-foreground">Wholesalers</h2>
          <p className="text-muted-foreground text-sm sm:text-base">Manage your wholesaler contacts</p>
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
          <Button variant="outline" onClick={handleImportClick}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                <span className="truncate">Add Wholesaler</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Wholesaler</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="Enter contact person name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter address"
                  />
                </div>
                <Button onClick={handleAdd} className="w-full">
                  Add Wholesaler
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search wholesalers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Excel-like Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Company Name</TableHead>
              <TableHead className="font-semibold">Contact Person</TableHead>
              <TableHead className="font-semibold">Phone</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Address</TableHead>
              <TableHead className="font-semibold text-center w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredWholesalers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Users2 className="w-8 h-8 mb-2" />
                    {wholesalers.length === 0 
                      ? 'No wholesalers added yet. Click "Add Wholesaler" to get started.'
                      : 'No wholesalers match your search.'}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredWholesalers.map((wholesaler) => (
                <TableRow key={wholesaler.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{wholesaler.name}</TableCell>
                  <TableCell>{wholesaler.contactPerson || '-'}</TableCell>
                  <TableCell>{wholesaler.phone || '-'}</TableCell>
                  <TableCell>{wholesaler.email || '-'}</TableCell>
                  <TableCell>{wholesaler.address || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(wholesaler)}
                        className="h-8 w-8"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(wholesaler.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingWholesaler} onOpenChange={(open) => !open && setEditingWholesaler(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Wholesaler</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Company Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contactPerson">Contact Person</Label>
              <Input
                id="edit-contactPerson"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder="Enter contact person name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter address"
              />
            </div>
            <Button onClick={handleUpdate} className="w-full">
              Update Wholesaler
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
