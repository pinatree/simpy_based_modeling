from flask import Flask

def create_app():
    app = Flask(__name__)

    # Регистрируем Blueprint'ы
    from hosting.controllers.api.health import bp as healthBP
    from hosting.controllers.api.simulations import bp as simulationsBP

    app.register_blueprint(healthBP, url_prefix='/health')
    app.register_blueprint(simulationsBP, url_prefix='/api/simulations')

    return app