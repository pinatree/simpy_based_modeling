import random

class Train:

    def __init__(self, env, minTravelTime, maxTravelTime, capacity, source, sourceIndex, destination, destinationIndex):
        self.env = env
        self.travelTime = random.uniform(minTravelTime, maxTravelTime)
        self.capacity = capacity
        self.source = source
        self.sourceIndex = sourceIndex
        self.destination = destination
        self.destinationIndex = destinationIndex

        self.status = "GET_RESOURCES"
    
    def activate(self):
        self.env.process(self.runLifeCycle())

    def runLifeCycle(self):
        while True:
            self.status = "GET_RESOURCES"
            yield self.source.getResources(self.sourceIndex, self.capacity)
            self.status = "TO_DEST"
            yield self.env.timeout(self.travelTime)
            self.status = "PUT_RESOURCES"
            yield self.destination.putResources(self.destinationIndex, self.capacity)
            self.status = "TO_BASE"
            yield self.env.timeout(self.travelTime)
    
    def getStatus(self):
        return {
            "type": "Transport",
            "nodeType": "train",
            "currentStatus": self.status
        }