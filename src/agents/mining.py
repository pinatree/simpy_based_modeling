class Mining:
    MINING_SPEED = 480
    MINING_TIME = 1.0

    def __init__(self, env):
        self.env = env

    def getSimuIterator(self, destination):
        while True:
            yield destination.put(self.MINING_SPEED)
            yield self.env.timeout(self.MINING_TIME)