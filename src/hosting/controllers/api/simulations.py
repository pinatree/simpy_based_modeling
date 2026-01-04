from flask import Blueprint, request, jsonify

from modeling.modeling_core import ModelingCore
from hosting.controllers.modeling_core_repository import ModelingCoresSingletone

bp = Blueprint('simulations', __name__)

@bp.route('/')
def getSimulations():
    simulations = ModelingCoresSingletone.getAll()
    length = len(simulations)
    return jsonify({"simulationsCount": length})

@bp.route('/<int:simulationId>')
def getSimulation(simulationId):
    return jsonify({"simulation": []})

@bp.route('/<int:simulationId>/<simulationNodeType>/<int:simulationNodeId>')
def getSimulationNode(simulationId, simulationNodeType, simulationNodeId):
    simCore = ModelingCoresSingletone.get(simulationId)
    return jsonify(simCore.getEntityStatus(simulationNodeType, simulationNodeId))

@bp.route('/', methods=['POST'])
def runSimulation():
    simulationMap = request.get_json()
    #create core instance with imported map
    coreInstance = ModelingCore(simulationMap)
    #register core instance and set id
    newId = ModelingCoresSingletone.add(coreInstance)
    #start simulation
    coreInstance.start_simulation()
    return jsonify({"id": newId})