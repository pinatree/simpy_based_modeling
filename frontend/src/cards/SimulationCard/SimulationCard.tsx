import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  Button,
  IconButton
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { type Simulation } from '../../domain/Simulation'

interface SimulationCardProps {
  simulation: Simulation;
  onOpen: (id: number) => void;
  onStop: (id: number) => void;
  onDelete: (simulation: Simulation) => void;
  onSettings?: (simulation: Simulation) => void;
}

export const SimulationCard: React.FC<SimulationCardProps> = ({
  simulation,
  onOpen,
  onStop,
  onDelete,
  onSettings
}) => {
  // Функция для форматирования продолжительности
  const formatDuration = (minutes: number): string => {
    if (minutes === 0) return '0 минут';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours} ${getHoursWord(hours)}`);
    if (mins > 0) parts.push(`${mins} ${getMinutesWord(mins)}`);
    
    return parts.join(' ');
  };

  // Вспомогательные функции для правильного склонения
  const getHoursWord = (hours: number): string => {
    if (hours % 10 === 1 && hours % 100 !== 11) return 'час';
    if ([2, 3, 4].includes(hours % 10) && ![12, 13, 14].includes(hours % 100)) return 'часа';
    return 'часов';
  };

  const getMinutesWord = (minutes: number): string => {
    if (minutes % 10 === 1 && minutes % 100 !== 11) return 'минута';
    if ([2, 3, 4].includes(minutes % 10) && ![12, 13, 14].includes(minutes % 100)) return 'минуты';
    return 'минут';
  };

  // Получение цвета статуса
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'success';
      case 'stopped': return 'error';
      case 'paused': return 'warning';
      default: return 'default';
    }
  };

  // Перевод статуса
  const getStatusText = (status: string) => {
    switch (status) {
      case 'running': return 'Запущена';
      case 'stopped': return 'Остановлена';
      case 'paused': return 'На паузе';
      default: return status;
    }
  };

  return (
    <Card className='create-simulation-list-card'>
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Заголовок и статус */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 3
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 'bold', flex: 1 }}>
            {simulation.name}
          </Typography>
          <Chip
            label={getStatusText(simulation.status)}
            color={getStatusColor(simulation.status) as any}
            size="small"
            sx={{ ml: 1 }}
          />
        </Box>

        {/* Описание */}
        <Typography
          color="text.secondary"
          sx={{
            mb: 3,
            fontSize: '0.9rem',
            lineHeight: 1.5
          }}
        >
          {simulation.caption}
        </Typography>

        {/* Детали симуляции */}
        <Box
          sx={{
            backgroundColor: 'grey.50',
            borderRadius: 1,
            p: 2,
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          {/* Реальное время выполнения */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              mb: 1.5
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 'medium' }}
            >
              Реальное время:
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 'bold' }}
            >
              {formatDuration(simulation.duration)}
            </Typography>
          </Box>

          {/* Ускорение */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              mb: 1.5
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 'medium' }}
            >
              Ускорение:
            </Typography>
            <Chip
              label={simulation.acceleration}
              size="small"
              sx={{
                backgroundColor: 'primary.light',
                color: 'white',
                fontWeight: 'bold'
              }}
            />
          </Box>

          {/* Модельное время */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              mb: 1.5
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 'medium' }}
            >
              Модельное время:
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 'bold',
                color: 'primary.main'
              }}
            >
              {simulation.modelTime}
            </Typography>
          </Box>
        </Box>
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', p: 2, pt: 0 }}>
        <Box>
          {simulation.status === 'running' ? (
            <Button
              variant="contained"
              color="error"
              startIcon={<StopIcon />}
              onClick={() => onStop(simulation.id)}
              size="small"
            >
              Остановить
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              startIcon={<PlayIcon />}
              onClick={() => onOpen(simulation.id)}
              size="small"
            >
              Открыть
            </Button>
          )}
        </Box>
        <Box>
          <IconButton
            size="small"
            onClick={() => onDelete(simulation)}
            color="error"
          >
            <DeleteIcon />
          </IconButton>
          <IconButton 
            size="small"
            onClick={() => onSettings && onSettings(simulation)}
          >
            <SettingsIcon />
          </IconButton>
        </Box>
      </CardActions>
    </Card>
  );
};

export default SimulationCard;