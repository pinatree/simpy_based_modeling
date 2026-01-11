import { type Simulation } from '../domain/Simulation'

export const getDemoSimulations = (): Simulation[] => {
  // Вспомогательная функция для генерации случайного числа в диапазоне
  const randomBetween = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  // Вспомогательная функция для форматирования времени
  const formatModelTime = (hours: number, minutes: number) => {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  // Предопределенные ускорения
  const accelerations = ['x10', 'x100', 'x1000', 'x10000', 'x100000'] as const

  // Названия симуляций для разнообразия
  const simulationNames = [
    'Цех покраски кабин',
    'Склад механических запчастей',
    'Линия сборки двигателей',
    'Логистика доставки',
    'Контроль качества продукции',
    'Сварочный цех №5',
    'Гальваническое покрытие',
    'Склад шин и колес',
    'Планирование производства',
    'Термическая обработка деталей',
    'Фрезерный участок ЧПУ',
    'Упаковка готовой продукции',
    'Анализ энергопотребления',
    'Токарный цех',
    'Цех сборки кабин',
    'Транспортная система завода',
    'Очистные сооружения',
    'Система вентиляции',
    'Роботизированная сварка',
    'Покрасочная камера'
  ]

  // Описания симуляций
  const simulationcaptions = [
    'Моделирование процесса покраски кабин тракторов',
    'Оптимизация работы склада механических запчастей',
    'Симуляция конвейерной сборки дизельных двигателей',
    'Оптимизация маршрутов доставки запчастей',
    'Симуляция процессов контроля качества продукции',
    'Моделирование работы автоматизированных сварочных линий',
    'Симуляция процесса нанесения защитных покрытий',
    'Оптимизация хранения и выдачи колесных пар',
    'Алгоритм планирования производственных заданий',
    'Симуляция печей для закалки металлических деталей',
    'Моделирование работы станков с ЧПУ',
    'Автоматизация процессов упаковки',
    'Анализ и оптимизация энергозатрат',
    'Симуляция обработки валов и осей',
    'Моделирование финальной сборки кабин',
    'Оптимизация перемещения материалов по заводу',
    'Моделирование работы очистных сооружений',
    'Симуляция системы вентиляции цехов',
    'Моделирование работы сварочных роботов',
    'Оптимизация процесса покраски деталей'
  ]

  // Статусы
  const statuses: Array<'stopped' | 'running' | 'paused'> = ['stopped', 'running', 'paused']

  // Генерация 20 симуляций
  const simulations: Simulation[] = []

  for (let i = 0; i < 20; i++) {
    const status = statuses[randomBetween(0, 2)]
    
    // Для работающих симуляций генерируем продолжительность от 15 до 1440 минут (24 часа)
    const duration = status === 'running' 
      ? randomBetween(15, 1440)
      : status === 'paused'
        ? randomBetween(1, 240)
        : 0
    
    // Случайное ускорение
    const acceleration = accelerations[randomBetween(0, 4)]
    
    // Вычисляем ускорение как числовое значение
    const accelerationMultiplier = parseInt(acceleration.substring(1))
    
    // Модельное время в минутах = реальное время * ускорение * случайный коэффициент погрешности (0.7-1.5)
    const errorCoefficient = 0.7 + Math.random() * 0.8 // 0.7-1.5
    const modelTimeMinutes = Math.floor(duration * accelerationMultiplier * errorCoefficient)
    
    // Преобразуем модельное время в часы и минуты
    const modelTimeHours = Math.floor(modelTimeMinutes / 60)
    const modelTimeMinutesRemainder = modelTimeMinutes % 60
    
    // Форматируем модельное время
    const modelTime = formatModelTime(modelTimeHours, modelTimeMinutesRemainder)

    simulations.push({
      id: i + 1,
      name: simulationNames[i],
      caption: simulationcaptions[i],
      status: status,
      duration: duration,
      acceleration: acceleration,
      modelTime: modelTime
    })
  }

  return simulations
}