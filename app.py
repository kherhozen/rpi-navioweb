from flask import Flask, render_template
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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
