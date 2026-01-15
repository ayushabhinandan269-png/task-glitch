import { Snackbar, Button } from '@mui/material';

interface Props {
  open: boolean;
  onClose: () => void;
  onUndo: () => void;
}

export default function UndoSnackbar({ open, onClose, onUndo }: Props) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={onClose} //  must clear lastDeleted in parent
      message="Task deleted"
      action={
        <Button
          color="secondary"
          size="small"
          onClick={() => {
            onUndo();   // UPDATED: undo task
            onClose();  // UPDATED: immediately clear delete state
          }}
        >
          Undo
        </Button>
      }
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    />
  );
}

