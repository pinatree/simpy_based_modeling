export interface Simulation {
  id: number
  name: string
  caption: string
  status: 'stopped' | 'running' | 'paused'
  duration: number // продолжительность в минутах
  acceleration: string // к-т ускорения
  modelTime: string // модельное время в формате "HH:MM"
}