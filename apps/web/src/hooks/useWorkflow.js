import { useState } from 'react';
import pb from '@/lib/pocketbaseClient.js';

export function useWorkflow() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const saveFlow = async (flowName, nodes, connections, isAuto = false) => {
    setLoading(true);
    setError(null);
    try {
      const user = pb.authStore.model;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Generate a folder name from the user's name or email
      const generatedFolderName = user.name || user.email.split('@')[0] || 'MyWorkflows';
      
      const workflow = await pb.collection('workflows').create({
        name: isAuto ? `Auto-save: ${flowName}` : flowName,
        flowName,
        folderName: generatedFolderName,
        nodes,
        connections,
        description: isAuto ? 'Auto-saved before execution' : '',
        userId: user.id,
        public: false,
        timestamp: new Date().toISOString()
      }, { $autoCancel: false });

      setLoading(false);
      return workflow;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const loadFlows = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = pb.authStore.model;
      if (!user) {
        return [];
      }

      const workflows = await pb.collection('workflows').getFullList({
        filter: `userId = "${user.id}"`,
        sort: '-timestamp',
        $autoCancel: false
      });
      setLoading(false);
      return workflows;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const loadFlow = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const workflow = await pb.collection('workflows').getOne(id, { $autoCancel: false });
      setLoading(false);
      return workflow;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const deleteFlow = async (id) => {
    setLoading(true);
    setError(null);
    try {
      await pb.collection('workflows').delete(id, { $autoCancel: false });
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  return {
    saveFlow,
    loadFlows,
    loadFlow,
    deleteFlow,
    loading,
    error
  };
}