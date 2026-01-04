import simpy
from modeling.material_flow.node.import_endpoint import ImportEndpoint

class Sink:

    def __init__(self, env, resourceType):
        self.env = env
        self.resourceType = resourceType
        self.processedCount = 0
    
    def putResources(self, inputIndex, resourcesCount):
        self.processedCount = self.processedCount + resourcesCount
        event = self.env.event()
        event.succeed()
        return event
    
    def getImportNodes(self):
        return [ImportEndpoint(self.resourceType)]
    
    def getExportNodes(self):
        return []
    
    def getStatus(self):
        return {
            "type": "Node",
            "nodeType": "sync",
            "resource": self.resourceType,
            "accumulatedTotal": self.processedCount
        }