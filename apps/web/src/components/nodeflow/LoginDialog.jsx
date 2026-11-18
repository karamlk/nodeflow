import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient.js';

const LoginDialog = ({ open, onOpenChange, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await pb.collection('users').authWithPassword(email, password, { $autoCancel: false });
        toast.success('Logged in successfully');
      } else {
        await pb.collection('users').create({
          email,
          password,
          passwordConfirm: password,
        }, { $autoCancel: false });
        await pb.collection('users').authWithPassword(email, password, { $autoCancel: false });
        toast.success('Account created and logged in');
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isLogin ? 'Login to NodeFlow' : 'Create Account'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-background text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="bg-background text-foreground"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Sign Up'}
          </Button>
          <div className="text-center text-sm text-muted-foreground mt-4">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              className="text-primary hover:underline font-medium"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Sign up' : 'Login'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;