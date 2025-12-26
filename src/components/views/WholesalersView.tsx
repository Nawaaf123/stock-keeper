import { useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Phone, Mail, MapPin, User, Users2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Wholesalers</h2>
          <p className="text-muted-foreground">Manage your wholesaler contacts</p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
          <Button variant="outline" onClick={handleImportClick}>
            <Upload className="w-4 h-4 mr-2" />
            Import Wholesalers
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Wholesaler
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

      {wholesalers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users2 className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No wholesalers added yet. Click "Add Wholesaler" to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {wholesalers.map((wholesaler) => (
            <Card key={wholesaler.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">{wholesaler.name}</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(wholesaler)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(wholesaler.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {wholesaler.contactPerson && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    {wholesaler.contactPerson}
                  </div>
                )}
                {wholesaler.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    {wholesaler.phone}
                  </div>
                )}
                {wholesaler.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    {wholesaler.email}
                  </div>
                )}
                {wholesaler.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {wholesaler.address}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
