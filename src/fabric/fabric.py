import simpy

class Fabric:

    def __init__(self, env, fabricReciept):
        self.env = env
        self.fabricReciept = fabricReciept
        self.importSources = []
        self.importCapacity = []
        self.importSpeeds = []
        for importPoint in fabricReciept.fabricImports:
            newImport = simpy.Container(env, init=0, capacity=importPoint.capacity)
            self.importSources.append(newImport)
            self.importCapacity.append(importPoint.capacity)
        self.fabricReciept.exportDestinations = []
        for exportPoint in fabricReciept.fabricExports:
            newExport = simpy.Container(env, init=0, capacity=exportPoint.capacity)
            self.fabricReciept.exportDestinations.append(newExport)
    
    def putResources(self, inputIndex, resourcesCount):
        # Возвращаем событие напрямую, а не как генератор
        return self.importSources[inputIndex - 1].put(resourcesCount)

    def getSimuIterator(self):
        while True:
            #produce and export
            for index, importSource in enumerate(self.importSources):
                yield importSource.get(self.fabricReciept.fabricImports[index - 1].minForReciept)
            #for index, fabricExport in enumerate(self.fabricReciept.fabricExports):
            #    yield self.fabricReciept.exportDestinations.put(fabricExport.exportPerReciept)
            self.env.total_resources = self.env.total_resources + self.fabricReciept.fabricExports[0].exportPerReciept