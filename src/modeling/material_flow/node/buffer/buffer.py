import simpy
from modeling.material_flow.node.export_endpoint import ExportEndpoint
from modeling.material_flow.node.import_endpoint import ImportEndpoint

class Buffer:

    def __init__(self, env, resourceGuid, bufferSize, lockingImport, lockingExport, importLocklDelay, exportLockDelay):
        self.resourceGuid = resourceGuid
        self.bufferSize = bufferSize
        self.accumulatedResources = 0
        self.env = env
        self.container = simpy.Container(self.env, self.bufferSize, 0)
        self.lockingImport = lockingImport
        self.lockingExport = lockingExport
        self.importLocklDelay = importLocklDelay
        self.exportLockDelay = exportLockDelay

        self.totalIn = 0
        self.totalOut = 0
        
        # Ресурсы для блокировок
        self.import_resource = simpy.Resource(env, 1) if lockingImport else None
        self.export_resource = simpy.Resource(env, 1) if lockingExport else None
            
    def getResources(self, exportIndex, resourcesCount):
        self.totalOut = self.totalOut + resourcesCount
        """Получить ресурсы из буфера"""
        if self.lockingExport and self.export_resource:
            # Возвращаем составное событие: сначала захват ресурса, потом получение из контейнера
            return self._getWithLock(resourcesCount)
        else:
            # Без блокировки - просто возвращаем событие контейнера
            return self.container.get(resourcesCount)
    
    def putResources(self, inputIndex, resourcesCount):
        self.totalIn = self.totalIn + resourcesCount
        """Добавить ресурсы в буфер"""
        if self.lockingImport and self.import_resource:
            # Возвращаем составное событие: сначала захват ресурса, потом добавление в контейнер
            return self._putWithLock(resourcesCount)
        else:
            # Без блокировки - просто возвращаем событие контейнера
            return self.container.put(resourcesCount)
    
    def _getWithLock(self, resourcesCount):
        """Вспомогательный метод для получения с блокировкой"""
        def process():
            # Захватываем блокировку
            request = self.export_resource.request()
            yield request

            yield self.env.timeout(self.exportLockDelay)
            
            try:
                # Получаем ресурсы из контейнера
                yield self.container.get(resourcesCount)
            finally:
                # Освобождаем блокировку
                self.export_resource.release(request)
        
        return self.env.process(process())
    
    def _putWithLock(self, resourcesCount):
        """Вспомогательный метод для добавления с блокировкой"""
        def process():
            # Захватываем блокировку
            request = self.import_resource.request()
            yield request

            yield self.env.timeout(self.importLocklDelay)
            
            try:
                # Добавляем ресурсы в контейнер
                yield self.container.put(resourcesCount)
            finally:
                # Освобождаем блокировку
                self.import_resource.release(request)
        
        return self.env.process(process())
    
    def setExportBusy(self, busy=True):
        """Установить/снять блокировку экспорта вручную"""
        self.export_busy = busy
    
    def getImportNodes(self):
        return [ImportEndpoint(self.resourceGuid)]
    
    def getExportNodes(self):
        return [ExportEndpoint(self.resourceGuid)]
    
    def getStatus(self):
        return {
            "type": "Node",
            "nodeType": "buffer",
            "importUse": False if self.import_resource == None else len(self.import_resource.users) > 0,
            "importLocked": False if self.import_resource == None else len(self.import_resource.users) == self.import_resource.capacity,
            "importUse": False if self.export_resource == None else len(self.export_resource.users) > 0,
            "importLocked": False if self.export_resource == None else len(self.export_resource.users) == self.export_resource.capacity,
            "totalIn": self.totalIn,
            "totalOut": self.totalOut,
            "currentCount": self.container.level
        }