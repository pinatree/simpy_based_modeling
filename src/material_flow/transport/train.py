class Train:

    def __init__(self, env, travelTime, capacity, source, sourceIndex, destination, destinationIndex):
        self.env = env
        self.travelTime = travelTime
        self.capacity = capacity
        self.source = source
        self.sourceIndex = sourceIndex
        self.destination = destination
        self.destinationIndex = destinationIndex
    
    def activate(self):
        self.env.process(self.runLifeCycle())

    def runLifeCycle(self):
        while True:
            yield self.source.getResources(self.sourceIndex, self.capacity)
            yield self.env.timeout(self.travelTime)
            yield self.destination.putResources(self.destinationIndex, self.capacity)
            yield self.env.timeout(self.travelTime)