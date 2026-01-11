// Получение цвета статуса
export const getStatusColor = (status: string) => {
    switch (status) {
        case 'running': return 'success';
        case 'stopped': return 'error';
        case 'paused': return 'warning';
        default: return 'default';
    }
};

// Перевод статуса
export const getStatusText = (status: string) => {
    switch (status) {
        case 'running': return 'Запущена';
        case 'stopped': return 'Остановлена';
        case 'paused': return 'На паузе';
        default: return status;
    }
};

// Стили для сетки карточек
export const gridStyles = {
    display: 'grid',
    gridTemplateColumns: {
        xs: '1fr',
        sm: 'repeat(2, 1fr)',
        md: 'repeat(3, 1fr)'
    },
    gap: 3,
    mt: 2
};

// Функция для форматирования продолжительности
export const formatDuration = (minutes: number): string => {
  if (minutes === 0) return '0 минут';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  const parts = [];
  if (hours > 0) parts.push(`${hours} ${getHoursWord(hours)}`);
  if (mins > 0) parts.push(`${mins} ${getMinutesWord(mins)}`);
  
  return parts.join(' ');
};

// Вспомогательные функции для правильного склонения
export const getHoursWord = (hours: number): string => {
  if (hours % 10 === 1 && hours % 100 !== 11) return 'час';
  if ([2, 3, 4].includes(hours % 10) && ![12, 13, 14].includes(hours % 100)) return 'часа';
  return 'часов';
};

export  const getMinutesWord = (minutes: number): string => {
  if (minutes % 10 === 1 && minutes % 100 !== 11) return 'минута';
  if ([2, 3, 4].includes(minutes % 10) && ![12, 13, 14].includes(minutes % 100)) return 'минуты';
  return 'минут';
};