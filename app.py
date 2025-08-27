import time

from flask import Flask, render_template, request, jsonify
import subprocess

app = Flask(__name__)
app.ledproc = None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/runled')
def runled():
    if app.ledproc is None:
        app.ledproc = subprocess.Popen(["python", "/home/kherhozen/sources/Navio/Python/myi2c.py"])
        return "1"
    else:
        app.ledproc.terminate()
        app.ledproc = None
        return "0"

@app.route('/confled', methods=['POST'])
def confled():
    if request.is_json:
        received_data = request.get_json()
        with open('/home/kherhozen/sources/Navio/Python/conf_led', 'w') as f:
            f.write("{},{},{},{}".format(received_data.get('mode'), received_data.get('red'),
                                         received_data.get('green'), received_data.get('blue')))
        time.sleep(0.1)
        with open('/home/kherhozen/sources/Navio/Python/conf_led_status', 'r') as f:
            return jsonify({
                "message": f.read()
            })
    else:
        return jsonify({"error": "Request body must be JSON"}), 400

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
