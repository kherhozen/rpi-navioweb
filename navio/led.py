import smbus
import time
from gpiozero import LED
import threading

class NavioPWM:

    __GPIO_OUT_ENBL = 27

    # Registers/etc.
    __MODE1 = 0x00
    __MODE2 = 0x01
    __SUBADR1 = 0x02
    __SUBADR2 = 0x03
    __SUBADR3 = 0x04
    __PRESCALE = 0xFE
    __LED0_ON_L = 0x06
    __LED0_ON_H = 0x07
    __LED0_OFF_L = 0x08
    __LED0_OFF_H = 0x09
    __ALL_LED_ON_L = 0xFA
    __ALL_LED_ON_H = 0xFB
    __ALL_LED_OFF_L = 0xFC
    __ALL_LED_OFF_H = 0xFD

    # Bits
    __RESTART = 0x80
    __SLEEP = 0x10
    __ALLCALL = 0x01
    __INVRT = 0x10
    __OUTDRV = 0x04
    __FULL_OFF = 0x10

    def __init__(self):
        self.bus = smbus.SMBus(1)
        self.address = 0x40
        self.pin_enable = LED(self.__GPIO_OUT_ENBL)

    def set_all_pwm(self, on, off):
        """Sets all PWM channels"""
        self.bus.write_byte_data(self.address, self.__ALL_LED_ON_L, on & 0xFF)
        self.bus.write_byte_data(self.address, self.__ALL_LED_ON_H, on >> 8)
        self.bus.write_byte_data(self.address, self.__ALL_LED_OFF_L, off & 0xFF)
        self.bus.write_byte_data(self.address, self.__ALL_LED_OFF_H, off >> 8)

    def set_pwm(self, channel, duty_cycle=0.5, delay=0.0):
        if delay + duty_cycle <= 1:
            on = int(delay*4095)
            off = int(duty_cycle*4095) + on
            self.bus.write_byte_data(self.address, self.__LED0_ON_L + 4 * channel, on & 0xFF)
            self.bus.write_byte_data(self.address, self.__LED0_ON_H + 4 * channel, on >> 8)
            self.bus.write_byte_data(self.address, self.__LED0_OFF_L + 4 * channel, off & 0xFF)
            self.bus.write_byte_data(self.address, self.__LED0_OFF_H + 4 * channel, off >> 8)

    def start(self):
        self.bus.write_byte_data(self.address, self.__ALL_LED_OFF_H, self.__FULL_OFF)
        # self.bus.write_byte_data(self.address, self.__MODE2, self.__OUTDRV)
        # self.bus.write_byte_data(self.address, self.__MODE1, self.__ALLCALL)
        time.sleep(0.005)  # wait for oscillator
        mode1 = self.bus.read_byte_data(self.address, self.__MODE1)
        mode1 = mode1 & ~self.__SLEEP  # wake up (reset sleep)
        self.bus.write_byte_data(self.address, self.__MODE1, mode1)
        time.sleep(0.005)  # wait for oscillator
        self.pin_enable.off()  # Reversed logic

    def shutdown(self):
        self.pin_enable.off()  # Reversed logic
        self.bus.write_byte_data(self.address, self.__ALL_LED_OFF_H, self.__FULL_OFF)
        time.sleep(0.005)  # wait for oscillator
        mode1 = self.bus.read_byte_data(self.address, self.__MODE1)
        mode1 = mode1 & self.__SLEEP  # go to sleep
        self.bus.write_byte_data(self.address, self.__MODE1, mode1)

class NavioLED:

    __R_CHANNEL = 2
    __G_CHANNEL = 1
    __B_CHANNEL = 0

    RED = (1, 0, 0)
    GREEN = (0, 1, 0)
    BLUE = (0, 0, 1)
    YELLOW = (1, 1, 0)
    PURPLE = (1, 0, 1)
    CYAN = (0, 1, 1)

    CONF_LED_PATH = "/home/kherhozen/rpi-navioweb/conf_led"
    CONF_LED_STATUS_PATH = "/home/kherhozen/rpi-navioweb/conf_led_status"

    def __init__(self, pwm, color=(1.0, 1.0, 1.0), saturation=1.0):
        self.pwm = pwm
        self.color = color
        self.saturation = saturation
        self.pulse_run = False
        self.pulse_thread = None

    def set_color(self, color=(1.0, 1.0, 1.0)):
        self.color = color

    def set_saturation(self, saturation=1.0):
        self.saturation = saturation

    def set(self, color=(1.0, 1.0, 1.0), saturation=1.0):
        self.pwm.set_pwm(self.__R_CHANNEL, 1 - color[0] * saturation)
        self.pwm.set_pwm(self.__G_CHANNEL, 1 - color[1] * saturation)
        self.pwm.set_pwm(self.__B_CHANNEL, 1 - color[2] * saturation)

    def on(self):
        if self.pulse_thread:
            self.pulse_run = False
            self.pulse_thread.join()
            self.pulse_thread = None
        self.set(self.color, 1)

    def off(self):
        if self.pulse_thread:
            self.pulse_run = False
            self.pulse_thread.join()
            self.pulse_thread = None
        self.set((0, 0, 0), 0)

    def pulse_manager(self, on=0.0, off=0.0, fade_in=1.0, fade_out=0.5, cycles=0):
        i = 0
        step = 0.01
        on_steps = int(on / step)
        off_steps = int(off / step)
        fade_in_steps = int(fade_in / step)
        fade_out_steps = int(fade_out / step)
        while self.pulse_run and (cycles == 0 or i < cycles):
            self.set((0, 0, 0), 0)
            s = 0
            while self.pulse_run:
                if off_steps < s < off_steps + fade_in_steps:
                    self.set_saturation((s - off_steps) / (fade_in_steps - 1))
                    self.set(self.color, self.saturation)
                elif off_steps + fade_in_steps + on_steps < s < off_steps + fade_in_steps + on_steps + fade_out_steps:
                    self.set_saturation(1 - (s - off_steps - fade_in_steps - on_steps) / (fade_out_steps - 1))
                    self.set(self.color, self.saturation)
                elif s >= off_steps + fade_in_steps + on_steps + fade_out_steps:
                    break
                s += 1
                time.sleep(step)
            i += 1
        self.pulse_run = False
        self.set(self.color, 1.0)

    def pulse(self):
        if not self.pulse_thread:
            self.pulse_run = True
            self.pulse_thread = threading.Thread(target=self.pulse_manager)
            self.pulse_thread.start()

def stop():
    with open(NavioLED.CONF_LED_PATH, 'w') as f:
        f.write("0,0,0,0")

def main():
    pwm = NavioPWM()
    pwm.start()
    led = NavioLED(pwm)
    run = True
    status = "sleep"
    current_mode = None
    current_rgb = None
    with open(NavioLED.CONF_LED_PATH, 'w') as f:
        f.write("2,0,1,0")
    while run:
        with open(NavioLED.CONF_LED_PATH, 'r') as f:
            conf_led = f.read().split(',')
            try:
                mode = int(conf_led[0])
                rgb = tuple(map(float, conf_led[1:4]))
            except ValueError:
                pass
            else:
                if mode == 0:
                    run = False
                    status = "sleep"
                elif mode != current_mode and mode == 1:
                    led.off()
                    status = "off"
                else:
                    if rgb != current_rgb:
                        led.set_color(rgb)
                    if mode != current_mode and mode == 2:
                        led.on()
                        status = "on"
                    elif mode != current_mode and mode == 3:
                        led.pulse()
                        status = "pulse"
                if mode != current_mode or rgb != current_rgb:
                    with open(NavioLED.CONF_LED_STATUS_PATH, 'w') as fout:
                        fout.write(status)
                    current_mode = mode
                    current_rgb = rgb
        time.sleep(0.025)
    led.off()
    pwm.shutdown()

if __name__ == '__main__':
    main()
