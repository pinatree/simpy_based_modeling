class Teleport:
    def __init__(self, env, transportPerMinute, frame, source, sourceIndex, destination, destinationIndex):
        self.env = env
        self.delay = 1 / transportPerMinute * frame
        self.source = source
        self.sourceIndex = sourceIndex
        self.destination = destination
        self.destinationIndex = destinationIndex
        self.frame = frame

    def activate(self):
        self.env.process(self.runLifeCycle())

    def runLifeCycle(self):
        while True:
            yield self.source.getResources(self.sourceIndex, self.frame)
            yield self.env.timeout(self.delay)
            yield self.destination.putResources(self.destinationIndex, self.frame)

    
    def getStatus(self):
        return {
            "type": "Transport",
            "nodeType": "teleport"
        }