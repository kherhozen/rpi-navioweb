from flask import Flask, render_template, request, jsonify, Response
import navio.led as navio_led
import navio.barometer as navio_baro
import time

app = Flask(__name__)
app.led = navio_led.NavioLEDManager()
app.runled = False
app.baro = navio_baro.BarometerManager()
app.baro.start()

def generate_events():
    print("hello")
    yield f"data: {app.baro.get_data_str()}\n\n"
    time.sleep(0.5)

@app.route('/events')
def events():
    return Response(generate_events(), mimetype="text/event-stream")

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
