from flask import Flask, render_template, request, jsonify, Response
import json
import navio.led as navio_led
import navio.barometer as navio_baro
import navio.imu as navio_imu
import time

app = Flask(__name__)
app.led = navio_led.NavioLEDManager()
app.runled = False
app.baro = navio_baro.BarometerManager()
app.baro.start()
app.imu = navio_imu.IMUManager()
# app.imu.start()

def generate_events_baro():
    while True:
        data = {
            "time": time.time(),
            "OAT": app.baro.baro.get_temperature(),
            "Ps": app.baro.baro.get_pressure(),
            "IMU": app.imu.get_data_str()
        }
        yield f"data: {json.dumps(data)}\n\n"
        time.sleep(0.5)

@app.route('/events-baro')
def events():
    return Response(generate_events_baro(), mimetype="text/event-stream")

def generate_events_imu():
    while True:
        raw_data = app.imu.get_data()
        data = {
            "time": time.time(),
            "ax": raw_data[0][0],
            "ay": raw_data[0][1],
            "az": raw_data[0][2],
            "gx": raw_data[1][0],
            "gy": raw_data[1][1],
            "gz": raw_data[1][2],
            "mx": raw_data[2][0],
            "my": raw_data[2][1],
            "mz": raw_data[2][2]
        }
        yield f"data: {json.dumps(data)}\n\n"
        time.sleep(0.1)

@app.route('/events-imu')
def events():
    return Response(generate_events_imu(), mimetype="text/event-stream")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/runled', methods=['POST'])
def runled():
    if request.is_json:
        if not app.runled:
            app.led.start()
            app.runled = True
            return jsonify({"message": "LED Start"})
        else:
            app.led.shutdown()
            app.runled = False
            return jsonify({"message": "LED Stop"})
    else:
        return jsonify({"error": "Request body must be JSON"}), 400

@app.route('/confled', methods=['POST'])
def confled():
    if request.is_json:
        received_data = request.get_json()
        app.led.write_conf(received_data.get('mode'),
                           (received_data.get('red'), received_data.get('green'), received_data.get('blue'))
                           )
        return jsonify({
            "message": "Conf updated"
        })
    else:
        return jsonify({"error": "Request body must be JSON"}), 400

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
