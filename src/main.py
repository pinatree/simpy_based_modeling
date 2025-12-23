import matplotlib
matplotlib.use('TkAgg')
import matplotlib.pyplot as plt
import matplotlib.animation as animation
import simpy
from threading import Thread, Lock
import time
from material_flow.node.generator.resource_generator import ResourceGenerator

# Импортируем ваши классы
from agents.train import Train
from endpoint.railway_station import RailwayStation
from fabric.fabric import Fabric
from fabric.fabric_export import FabricExport
from fabric.fabric_import import FabricImport
from fabric.fabric_reciept import FabricReciept

# ========== КОНСТАНТЫ ==========
UPDATE_INTERVAL = 100  # 0.1 секунды в миллисекундах
SIMULATION_SPEED = 100 # Коэффициент ускорения симуляции

class MiningSystem:
    MINING_STORAGE_SIZE = 4*32*200*2
    FABRIC_STORAGE_SIZE = 4*32*200*2
    
    TRANSPORT_TIME_MIN = 20.0
    TRANSPORT_TIME_MAX = 30.0

    def getDefaultRudeMiner(self):
        resourceGenerator = ResourceGenerator(self.env, "rude", 480, 200, 1)
        resourceGenerator.activate()
        return resourceGenerator

    def __init__(self, env):
        self.env = env
        env.total_resources = 0.0

        #railway station mining
        self.miningRailwayStation = RailwayStation(env, self.MINING_STORAGE_SIZE, 1, False)

        #railway station for fabric
        self.fabricRailwayStation = RailwayStation(env, self.FABRIC_STORAGE_SIZE, 1, True)

        #trains
        trains = []
        for _ in range(2):
            train = Train(env, self.TRANSPORT_TIME_MIN, self.TRANSPORT_TIME_MAX)
            simuTrain = train.getSimuIterator(self.miningRailwayStation, self.fabricRailwayStation)
            env.process(simuTrain)
            trains.append(train)
        env.trains = trains

        # miners
        self.getDefaultRudeMiner()
        self.getDefaultRudeMiner()
        self.getDefaultRudeMiner()
        self.getDefaultRudeMiner()
        self.getDefaultRudeMiner()
        self.getDefaultRudeMiner()
        
        #fabric

        #export
        fabricExports = []
        exportSlitok = FabricExport("slitok", 3560, 4*32*200*2, "null")
        fabricExports.append(exportSlitok)

        #import
        fabricImports = []
        importRude = FabricImport("rude", 1920, 4*32*200*2, self.fabricRailwayStation, 800)
        fabricImports.append(importRude)

        #reciept
        fabricReciept = FabricReciept(fabricImports, fabricExports, 1)

        self.fabric = Fabric(env, fabricReciept)
        fabric = self.fabric.getSimuIterator()
        env.process(fabric)
        
class SimulationThread(Thread):
    
    def __init__(self):
        super().__init__(daemon=True)
        self.env = simpy.Environment()
        self.system = MiningSystem(self.env)
        
        # Общие данные для доступа из основного потока
        self.data_lock = Lock()
        self.current_time = 0.0
        self.total_resources = 0.0
        self.average_train_load = 0.0
        self.running = True
        
    def run(self):
        """Основной метод потока - выполнение симуляции"""
        print("Симуляция запущена в отдельном потоке")
        
        while self.running:
            
            # Продвигаем симуляцию с максимальной скоростью
            self.env.run(until=self.env.now + SIMULATION_SPEED * 0.1)
            
            with self.data_lock:
                self.current_time = self.env.now
                self.total_resources = self.env.total_resources
                averageTrainLoad = 0
                for train in self.env.trains:
                    averageTrainLoad = (averageTrainLoad + train.AVERAGE_LOAD) / 2
                self.average_train_load = averageTrainLoad

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
                'average_train_load': self.average_train_load
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
    fig, axes = plt.subplots(
        1, 4, 
        figsize=(20, 5),
        gridspec_kw={'width_ratios': [1, 1, 1, 1]}
    )
    
    # Извлекаем оси по отдельности для ясности
    ax_miners_text, ax_storage_text, ax_train_text, ax_output_text = axes
    
    fig.suptitle('Симуляция горно-металлургического комплекса', 
                fontsize=16, fontweight='bold')
    
    # НАСТРОЙКА ТЕКСТОВЫХ ПАНЕЛЕЙ
    # Отключаем оси для всех панелей
    for ax in axes:
        ax.axis('off')
    
    # Создаем текстовые объекты для каждой панели
    text_miners = ax_miners_text.text(
        0.02, 0.95,
        'Инициализация...',
        fontsize=10,
        fontfamily='monospace',
        verticalalignment='top',
        transform=ax_miners_text.transAxes,  # Используем трансформацию СВОЕЙ оси
        bbox=dict(boxstyle='round', facecolor='#f0f0f0', edgecolor='gray', alpha=0.8)
    )
    
    text_storage = ax_storage_text.text(
        0.02, 0.95,
        'Инициализация...',
        fontsize=10,
        fontfamily='monospace',
        verticalalignment='top',
        transform=ax_storage_text.transAxes,  # Используем трансформацию СВОЕЙ оси
        bbox=dict(boxstyle='round', facecolor='#e0f0ff', edgecolor='blue', alpha=0.8)
    )    
    
    text_train = ax_train_text.text(
        0.02, 0.95,
        'Инициализация...',
        fontsize=10,
        fontfamily='monospace',
        verticalalignment='top',
        transform=ax_train_text.transAxes,  # Используем трансформацию СВОЕЙ оси
        bbox=dict(boxstyle='round', facecolor='#f0e0ff', edgecolor='purple', alpha=0.8)
    ) 
    
    text_output = ax_output_text.text(
        0.02, 0.95,
        'Инициализация...',
        fontsize=10,
        fontfamily='monospace',
        verticalalignment='top',
        transform=ax_output_text.transAxes,  # Используем трансформацию СВОЕЙ оси
        bbox=dict(boxstyle='round', facecolor='#fff0e0', edgecolor='orange', alpha=0.8)
    )
    
    # Добавляем заголовки для каждого блока
    ax_miners_text.set_title('Добытчики', fontsize=12, fontweight='bold', pad=20)
    ax_storage_text.set_title('Склад', fontsize=12, fontweight='bold', pad=20)
    ax_train_text.set_title('Транспорт', fontsize=12, fontweight='bold', pad=20)
    ax_output_text.set_title('Выход продукции', fontsize=12, fontweight='bold', pad=20)
    
    def update_animation(frame):
        """Функция обновления анимации - вызывается каждые 0.1 секунды"""
        
        try:
            # Получаем данные из потока симуляции
            data = sim_thread.get_current_data()
                
            current_time = data['time']
            total_resources = data['total_resources']
            average_train_load = data['average_train_load']
            
            # Форматированный текст (разный для каждой панели)
            miners_text = (
                f"╔═════════════════════════════════════════╗\n"
                f"║ ДОБЫТЧИКИ [{current_time:7.1f} мин]     ║\n"
                f"╠═════════════════════════════════════════╣\n"
                f"║ Эталонная добыча: 1920 ед/мин           ║\n"
                f"║ Фактическая добыча (сред): ???? ед/мин  ║\n"
                f"║ Эффективность: ??%                      ║\n"
                f"╚═════════════════════════════════════════╝"
            )
            
            storage_text = (
                f"╔═════════════════════════════════════════╗\n"
                f"║ СКЛАД                                   ║\n"
                f"╠═════════════════════════════════════════╣\n"
                f"║ Средняя заполненность:    ?????/51200   ║\n"
                f"║ Время простоя: ??%                      ║\n"
                f"╚═════════════════════════════════════════╝"
            )
            
            train_text = (
                f"╔══════════════════════════════════════╗\n"
                f"║ ТРАНСПОРТ                            ║\n"
                f"╠══════════════════════════════════════╣\n"
                f"║ Поездов:                  2          ║\n"
                f"║ Средняя заполненность: [{average_train_load/(4*32*200)*100}]%           ║\n"
                f"╚══════════════════════════════════════╝"
            )
            
            output_text = (
                f"╔════════════════════════════════════════════╗\n"
                f"║ ВЫХОД                                      ║\n"
                f"╠════════════════════════════════════════════╣\n"
                f"║ Всего переработано: [{total_resources}]    ║\n"
                f"║ Скорость (сред): [{total_resources/current_time}] ед/мин               ║\n"
                f"╚════════════════════════════════════════════╝"
            )
            
            # Обновляем все четыре текстовые панели
            text_miners.set_text(miners_text)
            text_storage.set_text(storage_text)
            text_train.set_text(train_text)
            text_output.set_text(output_text)
        
        except Exception as e:
            print(f"Ошибка в анимации: {e}")
        
        # Возвращаем все четыре текстовых объекта для отрисовки
        return [text_miners, text_storage, text_train, text_output]
    
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