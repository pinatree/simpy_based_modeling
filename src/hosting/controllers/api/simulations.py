from flask import Blueprint, request, jsonify

from modeling.modeling_core import ModelingCore
from hosting.controllers.modeling_core_repository import ModelingCoresSingletone

bp = Blueprint('simulations', __name__)

@bp.route('/')
def getSimulations():
    simulations = ModelingCoresSingletone.getAll()
    simulationsData = []
    id = 0
    for sim in simulations:
        id = id + 1
        simData = {
            "id": id,
            "name": simulations[sim].name,
            "caption": simulations[sim].caption,
            "status": "running",
            "duration": simulations[sim].getDuration(),
            "acceleration": "x?????",
            "modelTime": simulations[sim].getModelTime()
        }
        simulationsData.append(simData)
    return jsonify(simulationsData)

@bp.route('/<int:simulationId>')
def getSimulation(simulationId):
    return jsonify({"simulation": []})

@bp.route('/<int:simulationId>/<simulationNodeType>/<int:simulationNodeId>')
def getSimulationNode(simulationId, simulationNodeType, simulationNodeId):
    simCore = ModelingCoresSingletone.get(simulationId)
    time = simCore.env.now
    nodeStatus = simCore.getEntityStatus(simulationNodeType, simulationNodeId)
    nodeStatus["time"] = time
    return jsonify(nodeStatus)

@bp.route('/', methods=['POST'])
def runSimulation():
    simulationMap = request.get_json()
    #create core instance with imported map
    coreInstance = ModelingCore(simulationMap, simulationMap["name"], simulationMap["caption"])
    #register core instance and set id
    newId = ModelingCoresSingletone.add(coreInstance)
    #start simulation
    coreInstance.start_simulation()
    return jsonify({"id": newId})