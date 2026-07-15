from flask import jsonify


class ApiError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def register_error_handlers(app):
    @app.errorhandler(ApiError)
    def _handle_api_error(err: ApiError):
        return jsonify({"detail": err.message}), err.status_code

    @app.errorhandler(404)
    def _handle_not_found(err):
        return jsonify({"detail": "Not found"}), 404

    @app.errorhandler(405)
    def _handle_method_not_allowed(err):
        return jsonify({"detail": "Method not allowed"}), 405
