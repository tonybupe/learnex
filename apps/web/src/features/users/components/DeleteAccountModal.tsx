// features/users/components/DeleteAccountModal.tsx
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useDeleteUserAccount } from '../hooks/useUser';
import Button from '@/components/ui/Button';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
}

export default function DeleteAccountModal({ isOpen, onClose, userId }: DeleteAccountModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const deleteAccount = useDeleteUserAccount();

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    try {
      setError('');
      await deleteAccount.mutateAsync();
      // onClose will not be called as user will be redirected
    } catch (err) {
      setError('Failed to delete account. Please try again.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header delete-header">
          <AlertTriangle size={32} className="delete-icon" />
          <h2>Delete Account</h2>
          <p className="delete-warning">This action cannot be undone</p>
        </div>

        <div className="modal-content">
          <p className="delete-message">
            All your data will be permanently deleted. This includes:
          </p>
          <ul className="delete-list">
            <li>Your profile information</li>
            <li>Your posts and comments</li>
            <li>Your messages and conversations</li>
            <li>Your followers and following</li>
          </ul>

          <div className="confirm-section">
            <label htmlFor="confirm-delete">Type DELETE to confirm</label>
            <input
              id="confirm-delete"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="delete-confirm-input"
              disabled={deleteAccount.isPending}
            />
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="modal-actions delete-actions">
          <Button onClick={onClose} variant="secondary" disabled={deleteAccount.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleDelete} 
            variant="danger"
            disabled={deleteAccount.isPending || confirmText !== 'DELETE'}
          >
            {deleteAccount.isPending ? 'Deleting...' : 'Permanently Delete Account'}
          </Button>
        </div>
      </div>
    </div>
  );
}