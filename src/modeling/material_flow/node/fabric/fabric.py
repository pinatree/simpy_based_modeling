import simpy

class Fabric:

    def __init__(self, env, fabricReciept):
        self.env = env
        self.fabricReciept = fabricReciept
        self.importSources = []
        for importPoint in fabricReciept.fabricImports:
            newImport = simpy.Container(env, init=0, capacity=importPoint.capacity)
            self.importSources.append(newImport)
        self.exportDestinations = []
        for exportPoint in fabricReciept.fabricExports:
            newExport = simpy.Container(env, init=0, capacity=exportPoint.capacity)
            self.exportDestinations.append(newExport)
    
    def putResources(self, inputIndex, resourcesCount):
        # Возвращаем событие напрямую, а не как генератор
        return self.importSources[inputIndex - 1].put(resourcesCount)
    
    def getResources(self, exportIndex, resourcesCount):
        return self.exportDestinations[exportIndex - 1].get(resourcesCount)

    def getSimuIterator(self):
        while True:
            #produce and export
            for index, importSource in enumerate(self.importSources):
                yield importSource.get(self.fabricReciept.fabricImports[index - 1].minForReciept)
            #wait for produce
            yield self.env.timeout(self.fabricReciept.durationPerReciept)
            #export
            for index, fabricExport in enumerate(self.exportDestinations):
                yield fabricExport.put(self.fabricReciept.fabricExports[index - 1].exportPerReciept)
    
    def getStatus(self):
        return {
            "type": "Node",
            "nodeType": "fabric"
        }