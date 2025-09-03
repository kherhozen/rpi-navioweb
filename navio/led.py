import time
import threading
import navio.pwm as navio_pwm

class NavioLED:

    R_CHANNEL = 2
    G_CHANNEL = 1
    B_CHANNEL = 0

    RED = (1, 0, 0)
    GREEN = (0, 1, 0)
    BLUE = (0, 0, 1)
    YELLOW = (1, 1, 0)
    PURPLE = (1, 0, 1)
    CYAN = (0, 1, 1)

    def __init__(self, color=(1.0, 1.0, 1.0), saturation=1.0):
        self.pwm = navio_pwm.NavioPWM()
        self.color = color
        self.saturation = saturation
        self.run = True
        self.t_update = threading.Thread(target=self.__update)
        self.pulse_run = False
        self.t_pulse = None

        self.pwm.start()
        self.t_update.start()

    def __update(self):
        while self.run:
            self.pwm.set_pwm(self.R_CHANNEL, 1 - self.color[0] * self.saturation)
            self.pwm.set_pwm(self.G_CHANNEL, 1 - self.color[1] * self.saturation)
            self.pwm.set_pwm(self.B_CHANNEL, 1 - self.color[2] * self.saturation)
            time.sleep(0.01)

    def set_color(self, color=(1.0, 1.0, 1.0)):
        self.color = color

    def set_saturation(self, saturation=1.0):
        self.saturation = saturation

    def on(self):
        if self.t_pulse:
            self.pulse_run = False
            self.t_pulse.join()
            self.t_pulse = None
        self.set_saturation(1)

    def off(self):
        if self.t_pulse:
            self.pulse_run = False
            self.t_pulse.join()
            self.t_pulse = None
        self.set_saturation(0)

    def __pulse_manager(self, on=0.0, off=0.0, fade_in=1.0, fade_out=0.5, cycles=0):
        i = 0
        step = 0.01
        on_steps = int(on / step)
        off_steps = int(off / step)
        fade_in_steps = int(fade_in / step)
        fade_out_steps = int(fade_out / step)
        while self.pulse_run and (cycles == 0 or i < cycles):
            self.set_saturation(0)
            s = 0
            while self.pulse_run:
                if off_steps < s < off_steps + fade_in_steps:
                    self.set_saturation((s - off_steps) / (fade_in_steps - 1))
                elif off_steps + fade_in_steps + on_steps < s < off_steps + fade_in_steps + on_steps + fade_out_steps:
                    self.set_saturation(1 - (s - off_steps - fade_in_steps - on_steps) / (fade_out_steps - 1))
                elif s >= off_steps + fade_in_steps + on_steps + fade_out_steps:
                    break
                s += 1
                time.sleep(step)
            i += 1
        self.pulse_run = False
        self.set_saturation(1)

    def pulse(self):
        if not self.t_pulse:
            self.pulse_run = True
            self.t_pulse = threading.Thread(target=self.__pulse_manager)
            self.t_pulse.start()

    def shutdown(self):
        self.off()
        self.pwm.shutdown()


class NavioLEDManager:

    CONF_LED_PATH = "/tmp/rpi-navioweb/conf_led"
    CONF_LED_STATUS_PATH = "/tmp/rpi-navioweb/conf_led_status"

    def __init__(self):
        self.led = NavioLED()
        self.run = True
        self.t_update = None
        self.mode = 2
        self.rgb = self.led.GREEN
        with open(self.CONF_LED_PATH, 'w') as f:
            f.write("{},{},{},{}".format(self.mode, *self.rgb))

    def load_conf(self):
        with open(self.CONF_LED_PATH, 'r') as f:
            conf_led = f.read().split(',')
        try:
            mode = int(conf_led[0])
            rgb = tuple(map(float, conf_led[1:4]))
        except ValueError:
            pass
        else:
            self.led.set_color(rgb)
            if mode == 1:
                self.led.off()
                status = "off"
            elif mode == 2:
                self.led.on()
                status = "on"
            elif mode == 3:
                self.led.pulse()
                status = "pulse"
            else:
                self.run = False
                status = "sleep"
            if mode != self.mode or rgb != self.rgb:
                with open(self.CONF_LED_STATUS_PATH, 'w') as fout:
                    fout.write(status)
                self.mode = mode
                self.rgb = rgb

    def write_conf(self, mode=0, color=(0.0, 0.0, 0.0)):
        with open(self.CONF_LED_PATH, 'w') as f:
            f.write("{},{},{},{}".format(mode, *color))

    def __update(self):
        while self.run:
            self.load_conf()
            time.sleep(0.025)

    def start(self):
        if not self.t_update:
            self.t_update = threading.Thread(target=self.__update)
            self.t_update.start()

    def shutdown(self):
        self.run = False
        if self.t_update:
            self.run = False
            self.t_update.join()
            self.t_update = None
        self.led.shutdown()
