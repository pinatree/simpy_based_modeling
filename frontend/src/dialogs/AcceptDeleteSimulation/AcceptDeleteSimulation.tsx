import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import {
  Delete as DeleteIcon
} from '@mui/icons-material';

interface AcceptDeleteSimulationProps {
    isOpen: boolean,
    setOpen: (open: boolean) => void,
    simulationId: number,
    simulationName: string,
    onAccept: (simulationId: number) => void
}

export const AcceptDeleteSimulation: React.FC<AcceptDeleteSimulationProps> = ({
    isOpen,
    setOpen,
    simulationId,
    simulationName,
    onAccept
}) => {
    return (
        <Dialog
            open={isOpen}
            onClose={() => setOpen(false)}
            maxWidth="xs"
        >
            <DialogTitle>
                Подтверждение удаления
            </DialogTitle>
            <DialogContent>
                <Typography>
                    Вы уверены, что хотите удалить симуляцию "{simulationName}"?
                    Это действие нельзя отменить.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={() => setOpen(false)}
                    color="inherit"
                >
                    Отмена
                </Button>
                <Button
                    onClick={() => onAccept(simulationId)}
                    color="error"
                    variant="contained"
                    startIcon={<DeleteIcon />}
                >
                    Удалить
                </Button>
            </DialogActions>
        </Dialog>
    )
};