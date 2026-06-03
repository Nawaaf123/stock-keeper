import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { KeyRound, Trash2, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface AppUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

async function call(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('admin-create-user', {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function UsersView() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetUser, setResetUser] = useState<AppUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await call('list');
      setUsers(data.users ?? []);
    } catch (e) {
      toast({ title: 'Failed to load users', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onCreate = async () => {
    if (!email || password.length < 6) {
      toast({ title: 'Invalid input', description: 'Email and password (min 6 chars) required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await call('create', { email: email.trim(), password });
      toast({ title: 'User created', description: email });
      setEmail(''); setPassword(''); setOpen(false);
      load();
    } catch (e) {
      toast({ title: 'Create failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string, em: string) => {
    if (!confirm(`Delete user ${em}?`)) return;
    try {
      await call('delete', { id });
      toast({ title: 'User deleted' });
      load();
    } catch (e) {
      toast({ title: 'Delete failed', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const onResetPassword = async () => {
    if (!resetUser || resetPassword.length < 6) {
      toast({ title: 'Invalid input', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setResetting(true);
    try {
      await call('reset_password', { id: resetUser.id, password: resetPassword });
      toast({ title: 'Password updated', description: resetUser.email });
      setResetUser(null); setResetPassword('');
    } catch (e) {
      toast({ title: 'Reset failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 space-y-0">
          <CardTitle>Users</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full sm:w-auto"><UserPlus className="w-4 h-4 mr-2" /> Add user</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create new user</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="new-email">Email</Label>
                  <Input id="new-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Password</Label>
                  <Input id="new-password" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={onCreate} disabled={submitting}>{submitting ? 'Creating…' : 'Create'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Email</TableHead>
                    <TableHead className="whitespace-nowrap">Created</TableHead>
                    <TableHead className="whitespace-nowrap">Last sign-in</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium break-all">{u.email}{u.id === currentUser?.id && <span className="text-xs text-muted-foreground ml-2">(you)</span>}</TableCell>
                      <TableCell className="whitespace-nowrap">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="whitespace-nowrap">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : '—'}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" disabled={u.id === currentUser?.id} onClick={() => onDelete(u.id, u.email)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No users yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
