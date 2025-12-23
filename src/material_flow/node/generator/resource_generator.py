import simpy
import random
from material_flow.node.export_endpoint import ExportEndpoint

class ResourceGenerator:

    WAIT_MINING = 1.0
    ACTIVATE_PER_MINUTE = 60

    def __init__(self, env, resourceGuid, generatePerMinute, bufferSize, endpointsCount):
        self.resourceGuid = resourceGuid
        self.bufferSize = bufferSize
        self.accumulatedResources = 0
        self.env = env
        self.generatePerMinute = generatePerMinute
        self.endpointsCount = endpointsCount

    def activate(self):
        self.env.process(self.runLifeCycle())

    def runLifeCycle(self):
        self.containers = []
        for _ in range(self.endpointsCount):
            container = simpy.Container(self.env, self.bufferSize, 0)
            self.containers.append(container)
        while True:
            print(self.containers[0].level)
            randomContainerIndex = random.randint(0, self.endpointsCount - 1)
            yield self.containers[randomContainerIndex].put(self.generatePerMinute / self.ACTIVATE_PER_MINUTE)
            yield self.env.timeout(self.WAIT_MINING / self.ACTIVATE_PER_MINUTE)
            print(self.containers[0].level)

    def getImportNodes(self):
        return []
    
    def getExportNodes(self):
        exportNodes = []
        for _ in range(self.endpointsCount):
            exportNode = ExportEndpoint(self.resourceGuid)
            exportNodes.append(exportNode)
        return exportNodes
    
    def getResources(self, exportIndex, resourcesCount):
        yield self.containers[exportIndex].get(resourcesCount)