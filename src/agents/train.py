import random

class Train:
    LOAD_TIME = 1.0
    TRANSPORT_WAITING = 0.5
    UNLOAD_TIME = 1.0
    TRANSPORT_MAX_LOAD = 4*32*200

    def __init__(self, env, travelMinTime, travelMaxTime):
        self.env = env
        self.TRANSPORT_TIME_MIN = travelMinTime
        self.TRANSPORT_TIME_MAX = travelMaxTime

    def getSimuIterator(self, sourceConnectionPoint, source, destinationConnectionPoint):
        while True:
            to_load = 0
            with sourceConnectionPoint.request() as req_loading_area:
                yield req_loading_area
                to_load = min(source.level, self.TRANSPORT_MAX_LOAD)
                if to_load > 0:
                    yield source.get(to_load)
                    yield self.env.timeout(self.LOAD_TIME)
            # 2. Перевозим (теперь склад разблокирован для других!)
            yield self.env.timeout(random.uniform(self.TRANSPORT_TIME_MIN, self.TRANSPORT_TIME_MAX))
            with destinationConnectionPoint.request() as req:
                yield req
                if to_load > 0:
                    self.env.total_resources += to_load
                    yield self.env.timeout(self.UNLOAD_TIME)  # Время разгрузки

            # 4. Возвращаемся
            yield self.env.timeout(random.uniform(self.TRANSPORT_TIME_MIN, self.TRANSPORT_TIME_MAX))