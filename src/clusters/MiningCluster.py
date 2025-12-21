from agents.mining import Mining

class MiningCluster:

    def __init__(self, env, count):
        self.env = env
        self.count = count

    def appendToSim(self, destination):
        for _ in range(self.count):
            mining = Mining(self.env)
            simuMining = mining.getSimuIterator(destination)
            self.env.process(simuMining)