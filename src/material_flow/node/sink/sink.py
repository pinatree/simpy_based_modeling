import simpy
from material_flow.node.import_endpoint import ImportEndpoint

class Sink:

    def __init__(self, env):
        self.env = env
    
    def putResources(self, inputIndex, resourcesCount):
        self.env.total_resources = self.env.total_resources + resourcesCount
        event = self.env.event()
        event.succeed()
        return event
    
    def getImportNodes(self):
        return [ImportEndpoint("ne wajno")]
    
    def getExportNodes(self):
        return []