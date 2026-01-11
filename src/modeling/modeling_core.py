import simpy
import time
import datetime
from threading import Thread

from modeling.material_flow.node.generator.resource_generator import ResourceGenerator
from modeling.material_flow.transport.train import Train
from modeling.material_flow.node.fabric.fabric import Fabric
from modeling.material_flow.node.fabric.fabric_export import FabricExport
from modeling.material_flow.node.fabric.fabric_import import FabricImport
from modeling.material_flow.node.fabric.fabric_reciept import FabricReciept
from modeling.material_flow.transport.teleport import Teleport
from modeling.material_flow.node.buffer.buffer import Buffer
from modeling.material_flow.node.sink.sink import Sink

class ModelingCore:

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
    
    def getSimuLength(self):
        return self.env.now
    
    def getDuration(self):
        time_diff = datetime.datetime.now() - self.startTime  # Получаем timedelta
        return time_diff.total_seconds()  # Конвертируем секунды в минуты
    
    def getModelTime(self):
        return self.env.now

    def __init__(self, modelDescription, name, caption):
        self.name = name
        self.caption = caption
        self.startTime = datetime.datetime.now()

        self.running = False
        self.SIMULATION_SPEED = 1

        self.env = simpy.Environment()

        jsonNodes = modelDescription["nodes"]

        nodes = []

        self.nodes = dict()
        self.transports = dict()

        for node in jsonNodes:
            entityId = node["id"]
            nodeType = node["type"]
            if nodeType == "source":
                resourceType = node["resourceType"]
                miningSpeed = node["miningSpeed"]
                miningFrame = node["miningFrame"]
                capacity = node["internalStorageCapacity"]
                miner = self.getDefaultRudeMiner(resourceType, miningSpeed, miningFrame, capacity)
                nodes.append(miner)
                self.nodes[entityId] = miner
            if nodeType == "simple_storage":
                resourceType = node["resourceType"]
                importLock = node["importLock"]
                importLockDelay = node["importLockDelay"]
                exportLock = node["exportLock"]
                exportLockDelay = node["exportLockDelay"]
                capacity = node["capacity"]
                simpleStorage = Buffer(self.env, resourceType, capacity, importLock, exportLock, importLockDelay, exportLockDelay)
                nodes.append(simpleStorage)
                self.nodes[entityId] = simpleStorage
            if nodeType == "fabric":
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
                self.env.process(fabricIterator)
                nodes.append(fabric)
                self.nodes[entityId] = fabric
            if nodeType == "sink":
                resourceType = node["resourceType"]
                sink = Sink(self.env, resourceType)
                nodes.append(sink)
                self.nodes[entityId] = sink

        jsonTransport = modelDescription["transport"]

        transports = []

        for transport in jsonTransport:
            entityId = transport["id"]
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
                self.transports[entityId] = teleport
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
                self.transports[entityId] = train
    
    def getEntityStatus(self, entityType, entityId):
        if entityType == "Transport":
            return self.transports[entityId].getStatus()
        elif entityType == "Node":
            return self.nodes[entityId].getStatus()
    
    def start_simulation(self):
        """Запускает симуляцию в отдельном потоке"""
        if self.running:
            return False
        
        self.running = True
        self.thread = Thread(target=self._simulation_loop, daemon=True)
        self.thread.start()
        return True

    def _simulation_loop(self):
        """Основной цикл симуляции"""
        while self.running:
            try:
                self.env.run(until=self.env.now + self.SIMULATION_SPEED)
                time.sleep(0.01)
            except Exception as e:
                print(f"Simulation error: {e}")
                break
        
        self.running = False

    def remove_simulation(self):
        """Останавливает и очищает симуляцию"""
        self.running = False
        
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=1.0)
        
        self.thread = None
        self.env = None