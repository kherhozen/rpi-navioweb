import time

from flask import Flask, render_template, request, jsonify
import navio.led as navio_led
import threading

app = Flask(__name__)
app.led_thread = threading.Thread(target=navio_led.main)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/runled', methods=['POST'])
def runled():
    if request.is_json:
        if not app.led_thread.is_alive():
            app.led_thread.start()
            return jsonify({"message": "LED Start"})
        else:
            navio_led.stop()
            return jsonify({"message": "LED Stop"})
    else:
        return jsonify({"error": "Request body must be JSON"}), 400

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
