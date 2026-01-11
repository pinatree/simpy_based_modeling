class ModelingCoresSingletone:

    modelingCores = dict()
    modelingCoreNext = 0

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @staticmethod
    def add(item):
        """Статический метод для добавления элемента в статический массив"""
        ModelingCoresSingletone.modelingCores[ModelingCoresSingletone.modelingCoreNext] = item
        placedId = ModelingCoresSingletone.modelingCoreNext
        ModelingCoresSingletone.modelingCoreNext = ModelingCoresSingletone.modelingCoreNext + 1
        return placedId
        
    @staticmethod
    def get(id):
        return ModelingCoresSingletone.modelingCores[id]
    
    @staticmethod
    def getAll():
        return ModelingCoresSingletone.modelingCores