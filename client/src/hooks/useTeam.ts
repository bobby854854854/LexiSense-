import { useState } from 'react';
import { api } from '@/lib/api';
import type { User, Invitation } from '@shared/types';

export const useTeam = () => {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/team');
      setMembers(res.data);
    } finally {
      setLoading(false);
    }
  };

  const inviteMember = async (email: string, role: User['role']) => {
    setLoading(true);
    try {
      const res = await api.post('/api/team/invite', { email, role });
      return res.data as Invitation;
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (id: string, role: User['role']) => {
    setLoading(true);
    try {
      const res = await api.put(`/api/team/${id}/role`, { role });
      setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m));
      return res.data;
    } finally {
      setLoading(false);
    }
  };

  return { members, loading, fetchMembers, inviteMember, updateRole };
};