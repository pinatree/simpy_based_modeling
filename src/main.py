import matplotlib
matplotlib.use('TkAgg')
import matplotlib.pyplot as plt
import matplotlib.animation as animation
import simpy
from threading import Thread, Lock
import time
from material_flow.node.generator.resource_generator import ResourceGenerator

import json

# Импортируем ваши классы
from material_flow.transport.train import Train
from material_flow.node.fabric.fabric import Fabric
from material_flow.node.fabric.fabric_export import FabricExport
from material_flow.node.fabric.fabric_import import FabricImport
from material_flow.node.fabric.fabric_reciept import FabricReciept
from material_flow.transport.teleport import Teleport
from material_flow.node.buffer.buffer import Buffer
from material_flow.node.sink.sink import Sink

# ========== КОНСТАНТЫ ==========
UPDATE_INTERVAL = 100  # 0.1 секунды в миллисекундах
SIMULATION_SPEED = 1000 # Коэффициент ускорения симуляции

class MiningSystem:

    def getDefaultRudeMiner(self, resourceType, miningSpeed, miningFrame, capacity):
        resourceGenerator = ResourceGenerator(self.env, resourceType, miningSpeed, miningFrame, capacity)
        resourceGenerator.activate()
        return resourceGenerator
    
    def getDefaultTeleport(self, source, sourceIndex, destination, destinationIndex, perMinute, frame):
        teleport = Teleport(self.env, perMinute, frame, source, sourceIndex, destination, destinationIndex)
        teleport.activate()
        return teleport
    
    def getTrain(self, minTravelTime, maxTravelTime, capacity, source, sourceIndex, destination, destinationIndex):
        train = Train(self.env, minTravelTime, maxTravelTime, capacity, source, sourceIndex, destination, destinationIndex)
        train.activate()
        return train

    def __init__(self, env):

        self.env = env

        env.total_resources = 0.0
        
        with open('tests/demo.json', 'r', encoding='utf-8') as file:
            data = json.load(file)

        jsonNodes = data["nodes"]

        nodes = []

        for node in jsonNodes:
            nodeType = node["type"]
            if nodeType == "source":
                resourceType = node["resourceType"]
                miningSpeed = node["miningSpeed"]
                miningFrame = node["miningFrame"]
                capacity = node["internalStorageCapacity"]
                miner = self.getDefaultRudeMiner(resourceType, miningSpeed, miningFrame, capacity)
                nodes.append(miner)
            if nodeType == "simple_storage":
                resourceType = node["resourceType"]
                importLock = node["importLock"]
                importLockDelay = node["importLockDelay"]
                exportLock = node["exportLock"]
                exportLockDelay = node["exportLockDelay"]
                capacity = node["capacity"]
                simpleStorage = Buffer(self.env, resourceType, capacity, importLock, exportLock, importLockDelay, exportLockDelay)
                nodes.append(simpleStorage)
            if nodeType == "fabric":
                print(node)
                imports = []
                exports = []
                jsonImports = node["imports"]
                for jsonImport in jsonImports:
                    resourceType = jsonImport["resourceType"]
                    minForReciept = jsonImport["minForReciept"]
                    internalCapacity = jsonImport["internalCapacity"]
                    newImport = FabricImport(resourceType, minForReciept, internalCapacity)
                    imports.append(newImport)
                jsonExports = node["exports"]
                for jsonExport in jsonExports:
                    resourceType = jsonExport["resourceType"]
                    minForReciept = jsonExport["outPerReciept"]
                    internalCapacity = jsonExport["internalCapacity"]
                    newExport = FabricExport(resourceType, minForReciept, internalCapacity)
                    exports.append(newExport)
                recieptData = node["reciept"]
                duration = recieptData["delay"]
                fabricReciept = FabricReciept(imports, exports, duration)
                fabric = Fabric(self.env, fabricReciept)
                fabricIterator = fabric.getSimuIterator()
                env.process(fabricIterator)
                nodes.append(fabric)
            if nodeType == "sink":
                resourceType = node["resourceType"]
                sink = Sink(env, resourceType)
                nodes.append(sink)

        jsonTransport = data["transport"]

        transports = []

        for transport in jsonTransport:
            transportType = transport["type"]
            if transportType == "teleport":
                fromId = transport["from_id"]
                from_endpoint = transport["from_endpoint"]
                toId = transport["to_id"]
                to_endpoint = transport["to_endpoint"]
                perMinute = transport["data"]["perMinute"]
                frame = transport["data"]["frame"]
                teleport = self.getDefaultTeleport(nodes[fromId], from_endpoint, nodes[toId], to_endpoint, perMinute, frame)
                transports.append(teleport)
            if transportType == "train":
                fromId = transport["from_id"]
                from_endpoint = transport["from_endpoint"]
                toId = transport["to_id"]
                to_endpoint = transport["to_endpoint"]
                limit = transport["data"]["limit"]
                minDelay = transport["data"]["min_delay"]
                maxDelay = transport["data"]["max_delay"]
                train = self.getTrain(minDelay, maxDelay, limit, nodes[fromId], from_endpoint, nodes[toId], to_endpoint)
                transports.append(train)
     
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
                #for train in self.env.trains:
                #    averageTrainLoad = (averageTrainLoad + train.AVERAGE_LOAD) / 2
                self.average_train_load = averageTrainLoad

            # Небольшая пауза для избежания 100% загрузки CPU
            time.sleep(0.01)
            
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