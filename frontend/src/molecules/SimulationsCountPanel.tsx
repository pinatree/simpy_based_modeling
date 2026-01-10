import {
  Typography,
  Paper
} from '@mui/material';

import { type Simulation } from '../domain/Simulation'

interface SimulationsCountPanelProps {
  simulations: Simulation[];
}

export const SimulationsCountPanel: React.FC<SimulationsCountPanelProps> = ({
    simulations
}) => {
    return (
      <Paper
        sx={{
          mt: 4,
          p: 2,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 1
        }}
        variant="outlined"
      >
        <Typography variant="body2" color="text.secondary">
          Всего симуляций: <strong>{simulations.length}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Запущено: <strong>{simulations.filter(s => s.status === 'running').length}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Остановлено: <strong>{simulations.filter(s => s.status === 'stopped').length}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          На паузе: <strong>{simulations.filter(s => s.status === 'paused').length}</strong>
        </Typography>
      </Paper>
    )
};