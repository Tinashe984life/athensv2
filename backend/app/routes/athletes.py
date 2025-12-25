from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Athlete

bp = Blueprint('athletes', __name__, url_prefix='/api/athletes')

@bp.route('/', methods=['GET'])
@jwt_required()
def get_athletes():
    # This will be implemented in Phase 2
    return jsonify({
        'success': True,
        'athletes': [],
        'message': 'Athlete endpoint - to be implemented'
    })