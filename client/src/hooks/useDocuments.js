import { useState, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const useDocuments = () => {
  const [documents, setDocuments] = useState({ owned: [], shared: [] });
  const [loading, setLoading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/documents');
      setDocuments(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  const createDocument = useCallback(async (title = 'Untitled Document') => {
    try {
      const { data } = await api.post('/api/documents', { title });
      setDocuments((prev) => ({ ...prev, owned: [data, ...prev.owned] }));
      return data;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create document');
      return null;
    }
  }, []);

  const deleteDocument = useCallback(async (id) => {
    try {
      await api.delete(`/api/documents/${id}`);
      setDocuments((prev) => ({
        ...prev,
        owned: prev.owned.filter((d) => d._id !== id),
      }));
      toast.success('Document deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete document');
    }
  }, []);

  return { documents, loading, fetchDocuments, createDocument, deleteDocument };
};
