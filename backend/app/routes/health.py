from flask import Blueprint, jsonify
import datetime

bp = Blueprint('health', __name__, url_prefix='/api')

@bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.datetime.utcnow().isoformat(),
        'service': 'HER-PACE API'
    })