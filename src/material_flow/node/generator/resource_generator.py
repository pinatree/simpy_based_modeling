import simpy
from material_flow.node.export_endpoint import ExportEndpoint

class ResourceGenerator:

    def __init__(self, env, resourceGuid, generatePerMinute, frame, bufferSize):
        self.resourceGuid = resourceGuid
        self.bufferSize = bufferSize
        self.accumulatedResources = 0
        self.env = env
        self.frame = generatePerMinute / frame
        self.cooldown = frame / generatePerMinute

    def activate(self):
        self.env.process(self.runLifeCycle())

    def runLifeCycle(self):
        self.container = simpy.Container(self.env, self.bufferSize, 0)
        while True:
            yield self.container.put(self.frame)
            yield self.env.timeout(self.cooldown)

    def getImportNodes(self):
        return []
    
    def getExportNodes(self):
        return [ExportEndpoint(self.resourceGuid)]
    
    def getResources(self, exportIndex, resourcesCount):
        return self.container.get(resourcesCount)