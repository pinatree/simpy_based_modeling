from flask import Blueprint, jsonify

# Создаем Blueprint для API
bp = Blueprint('health', __name__)

@bp.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200