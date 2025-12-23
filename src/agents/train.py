import random

class Train:
    LOAD_TIME = 1.0
    TRANSPORT_WAITING = 0.5
    UNLOAD_TIME = 1.0
    TRANSPORT_MAX_LOAD = 4*32*200

    AVERAGE_LOAD = 0.0
    AVERAGE_LOAD_CNT = 0

    def __init__(self, env, travelMinTime, travelMaxTime):
        self.env = env
        self.TRANSPORT_TIME_MIN = travelMinTime
        self.TRANSPORT_TIME_MAX = travelMaxTime

    def getSimuIterator(self, source, destination):
        current_loading = 0
        while True:

            # 3. Забираем
            connectHandler = yield source.connect()
            to_load = min(source.station.level, self.TRANSPORT_MAX_LOAD - current_loading)
            self.AVERAGE_LOAD = (self.AVERAGE_LOAD * self.AVERAGE_LOAD_CNT + to_load) / (self.AVERAGE_LOAD_CNT + 1)
            self.AVERAGE_LOAD_CNT = self.AVERAGE_LOAD_CNT + 1
            if to_load > 0:
                yield source.get(to_load)
                yield self.env.timeout(self.LOAD_TIME)
                current_loading = to_load
            yield source.disconnect(connectHandler)

            # 2. Перевозим (теперь склад разблокирован для других!)
            yield self.env.timeout(random.uniform(self.TRANSPORT_TIME_MIN, self.TRANSPORT_TIME_MAX))

            # 3. Загружаем
            connectHandler = yield destination.connect()

            toUnload = min(destination.station.capacity, current_loading)
            current_loading -= toUnload
            if toUnload > 0:
                yield destination.put(toUnload)
                yield self.env.timeout(self.UNLOAD_TIME)
            yield destination.disconnect(connectHandler)

            # 4. Возвращаемся
            yield self.env.timeout(random.uniform(self.TRANSPORT_TIME_MIN, self.TRANSPORT_TIME_MAX))