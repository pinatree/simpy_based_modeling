import simpy

class Fabric:

    def __init__(self, env, fabricReciept):
        self.env = env
        self.fabricReciept = fabricReciept
        self.importSources = []
        self.accumulatedImport = []
        self.importCapacity = []
        self.importSpeeds = []
        for importPoint in fabricReciept.fabricImports:
            newImport = simpy.Container(env, init=0, capacity=importPoint.capacity)
            self.importSources.append(newImport)
            self.accumulatedImport.append(0)
            self.importCapacity.append(importPoint.capacity)
            self.importSpeeds.append(importPoint.importPerMinute)
        self.fabricReciept.exportDestinations = []
        for exportPoint in fabricReciept.fabricExports:
            newExport = simpy.Container(env, init=0, capacity=exportPoint.capacity)
            self.fabricReciept.exportDestinations.append(newExport)

    def getSimuIterator(self):
        while True:
            #collect resources
            for index, fabricImport in enumerate(self.fabricReciept.fabricImports):
                remainingToImpot = self.importCapacity[index] - self.accumulatedImport[index]
                toImport = min(remainingToImpot, self.importSpeeds[index])
                if(toImport > 0):
                    yield self.fabricReciept.fabricImports[index].source.get(toImport)
                    self.accumulatedImport[index] = self.accumulatedImport[index] + toImport
            #produce and export
            readyToProduce = True
            for index, fabricImport in enumerate(self.fabricReciept.fabricImports):
                if(self.accumulatedImport[index] < fabricImport.minForReciept):
                    readyToProduce = False
            if(readyToProduce == True):
                for index, fabricImport in enumerate(self.fabricReciept.fabricImports):
                    self.accumulatedImport[index] = self.accumulatedImport[index] - fabricImport.minForReciept
                #for(index, fabricExport) in enumerate(self.fabricReciept.exportDestinations):
                self.env.total_resources = self.env.total_resources + self.fabricReciept.fabricExports[0].exportPerReciept