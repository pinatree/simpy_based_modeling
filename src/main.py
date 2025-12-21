import matplotlib
matplotlib.use('TkAgg')
import matplotlib.pyplot as plt
import matplotlib.animation as animation
import simpy
import numpy as np
from collections import deque
from threading import Thread, Lock
import time

# Импортируем ваши классы
from agents.train import Train
from clusters.MiningCluster import MiningCluster 

# ========== КОНСТАНТЫ ==========
UPDATE_INTERVAL = 100  # 0.1 секунды в миллисекундах
SIMULATION_SPEED = 1000  # Коэффициент ускорения симуляции

class MiningSystem:
    MINING_STORAGE_SIZE = 4*32*200*2
    
    TRANSPORT_TIME_MIN = 8.0
    TRANSPORT_TIME_MAX = 10.0

    def __init__(self, env):
        self.env = env
        env.total_resources = 0.0
        
        # source storage
        self.mining_storage = simpy.Container(env, init=0, capacity=self.MINING_STORAGE_SIZE)
        env.maining_storage = self.mining_storage

        # minings for source
        miningCluster = MiningCluster(env, 4) 
        miningCluster.appendToSim(self.mining_storage)

        #loading and unloading for trains
        self.loading_area = simpy.Resource(env, capacity=1)
        self.unloading_area = simpy.Resource(env, capacity=1)

        #trains
        for _ in range(2):
            train = Train(env, self.TRANSPORT_TIME_MIN, self.TRANSPORT_TIME_MAX)
            simuTrain = train.getSimuIterator(self.loading_area, self.mining_storage, self.unloading_area)
            env.process(simuTrain)


class SimulationThread(Thread):
    
    def __init__(self):
        super().__init__(daemon=True)
        self.env = simpy.Environment()
        self.system = MiningSystem(self.env)
        
        # Общие данные для доступа из основного потока
        self.data_lock = Lock()
        self.current_time = 0.0
        self.total_resources = 0.0
        self.running = True
        
    def run(self):
        """Основной метод потока - выполнение симуляции"""
        print("Симуляция запущена в отдельном потоке")
        
        while self.running:
            
            # Продвигаем симуляцию с максимальной скоростью
            self.env.run(until=self.env.now + SIMULATION_SPEED * 0.1)
            self.current_time = self.env.now
            self.total_resources = self.env.total_resources

            # Небольшая пауза для избежания 100% загрузки CPU
            time.sleep(0.0001)
            
    def stop(self):
        """Остановка симуляции"""
        self.running = False
        
    def get_current_data(self):
        """Получение текущих данных для основного потока"""
        with self.data_lock:
            return {
                'time': self.current_time,
                'total_resources': self.total_resources,
            }


def run_simulation():
    print("\n" + "="*70)
    print("СИМУЛЯЦИЯ ГОРНО-МЕТАЛЛУРГИЧЕСКОГО КОМПЛЕКСА")
    print("="*70)
    print(f"Симуляция работает в отдельном потоке с ускорением {SIMULATION_SPEED}x")
    print(f"Обновление графика: каждые {UPDATE_INTERVAL/1000:.1f} секунды")
    print("Закройте окно для остановки")
    print("="*70)
    
    # Запускаем симуляцию в отдельном потоке
    sim_thread = SimulationThread()
    sim_thread.start()
    
    # СОЗДАЕМ СУБПЛОТЫ
    fig, (ax_miners_text, ax_storage_text, ax_train_text, ax_output_text) = plt.subplots(
        1, 4, 
        figsize=(20, 5),
        gridspec_kw={'width_ratios': [1, 1, 1, 1]}
    )
    
    fig.suptitle('Симуляция горно-металлургического комплекса', 
                fontsize=16, fontweight='bold')
    
    # НАСТРОЙКА ТЕКСТОВОЙ ПАНЕЛИ
    ax_miners_text.axis('off')
    text_panel = ax_miners_text.text(
        0.02, 0.95,
        'Инициализация...',
        fontsize=10,
        fontfamily='monospace',
        verticalalignment='top',
        transform=ax_miners_text.transAxes,
        bbox=dict(boxstyle='round', facecolor='#f0f0f0', edgecolor='gray', alpha=0.8)
    )

    ax_storage_text.axis('off')
    storage_text_panel = ax_storage_text.text(
        0.02, 0.95,
        'Инициализация...',
        fontsize=10,
        fontfamily='monospace',
        verticalalignment='top',
        transform=ax_miners_text.transAxes,
        bbox=dict(boxstyle='round', facecolor='#f0f0f0', edgecolor='gray', alpha=0.8)
    )    

    ax_train_text.axis('off')
    ax_train_text_panel = ax_train_text.text(
        0.02, 0.95,
        'Инициализация...',
        fontsize=10,
        fontfamily='monospace',
        verticalalignment='top',
        transform=ax_miners_text.transAxes,
        bbox=dict(boxstyle='round', facecolor='#f0f0f0', edgecolor='gray', alpha=0.8)
    ) 

    ax_output_text.axis('off')
    ax_train_text_panel = ax_output_text.text(
        0.02, 0.95,
        'Инициализация...',
        fontsize=10,
        fontfamily='monospace',
        verticalalignment='top',
        transform=ax_miners_text.transAxes,
        bbox=dict(boxstyle='round', facecolor='#f0f0f0', edgecolor='gray', alpha=0.8)
    )

    def update_animation(frame):
        """Функция обновления анимации - вызывается каждые 0.1 секунды"""
        
        try:
            # Получаем данные из потока симуляции
            data = sim_thread.get_current_data()
                
            # ОБНОВЛЯЕМ ТЕКСТОВУЮ ПАНЕЛЬ
            current_time = data['time']
            total_resources = data['total_resources']
            
            # Форматированный текст
            stats_text = (
                f"╔════════════════════════════════════════════════════════════════════╗\n"
                f"║ ТЕКУЩАЯ СТАТИСТИКА [{current_time:7.1f} мин]                     ║\n"
                f"╠════════════════════════════════════════════════════════════════════╣\n"
                f"║ Всего добыто:           {total_resources:12.0f} ед.              ║\n"
                f"╚════════════════════════════════════════════════════════════════════╝"
            )
            
            text_panel.set_text(stats_text)

            storage_text_panel.set_text(stats_text)

            ax_train_text_panel.set_text(stats_text)

            ax_output_text.set_text(stats_text)
        
        except Exception as e:
            print(f"Ошибка в анимации: {e}")
        
        # Возвращаем все элементы для отрисовки
        artists = [text_panel]
        return artists
    
    # Создаем анимацию с интервалом 0.1 секунды
    ani = animation.FuncAnimation(
        fig, 
        update_animation,
        interval=UPDATE_INTERVAL,
        blit=False,
        cache_frame_data=False,
        repeat=True
    )
    
    # Обработчик закрытия окна
    def on_close(event):
        print("\nОкно закрыто. Останавливаю симуляцию...")
        sim_thread.stop()
        sim_thread.join(timeout=2)
        
    fig.canvas.mpl_connect('close_event', on_close)
    
    try:
        plt.tight_layout()
        plt.show()
    except Exception as e:
        print(f"Ошибка отображения графиков: {e}")
    finally:
        # Останавливаем симуляцию при выходе
        sim_thread.stop()
        sim_thread.join(timeout=2)
        
        # Финальная статистика
        print("\n" + "="*70)
        print("ФИНАЛЬНАЯ СТАТИСТИКА")
        print("="*70)
        final_data = sim_thread.get_current_data()
        print(f"Общее время моделирования: {final_data['time']:.1f} мин")
        print(f"Всего добыто ресурсов: {final_data['total_resources']:.0f} ед.")
        print("="*70)


if __name__ == "__main__":
    run_simulation()