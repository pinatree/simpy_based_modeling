import simpy

class RailwayStation:

    def __init__(self, env, capacity, endpoints_count, log):
        self.log = log
        self.env = env
        # Container для хранения "груза" на станции
        self.station = simpy.Container(env, init=0, capacity=capacity)
        # Resource для ограничения одновременных подключений
        self.connection_points = simpy.Resource(env, endpoints_count)

    def connect(self):
        """Запускает и возвращает процесс подключения"""
        def _connect_process():
            # Процесс запроса ресурса
            request = self.connection_points.request()
            yield request
            return request  # Возвращаем сам request для последующего release
        
        # Запускаем процесс и возвращаем его
        return self.env.process(_connect_process())

    def disconnect(self, connectHandler):
        """Процесс освобождения подключения"""
        def _disconnect_process(handler):
            self.connection_points.release(handler)
            yield self.env.timeout(0)  # Пустой timeout для создания генератора
        
        return self.env.process(_disconnect_process(connectHandler))

    def put(self, count):
        """Поместить груз на станцию (возвращает процесс)"""
        def _put_process():
            # ContainerPut - это событие, его нужно yield'ить внутри процесса
            yield self.station.put(count)
            #if(self.log):
            #    print(self.station.level)
        
        # Запускаем как процесс и возвращаем
        return self.env.process(_put_process())

    def get(self, count):
        """Поместить груз на станцию (возвращает процесс)"""
        def _take_process():
            # ContainerPut - это событие, его нужно yield'ить внутри процесса
            yield self.station.get(count)
        
        # Запускаем как процесс и возвращаем
        return self.env.process(_take_process())