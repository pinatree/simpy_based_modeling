class MaterialFlowNode:
    
    def activate(self):
        raise 'not implemented'
    
    def runLifeCycle(self):
        raise 'not implemented'

    def getImportNodes(self):
        raise 'not implemented'

    def putResources(self, inputIndex, resourcesCount):
        raise 'not implemented'
    
    def getExportNodes(self):
        raise 'not implemented'
    
    def getResources(self, exportIndex, resourcesCount):
        raise 'not implemented'
    
    def getStatus(self):
        raise 'not implemented'