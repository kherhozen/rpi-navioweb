import smbus
import time
from signal import signal, SIGTERM, SIGINT
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
            self.pulse_thread.start()

def stop():
    with open('/home/kherhozen/sources/Navio/Python/conf_led', 'w') as f:
        f.write("0,0,0,0")

def signal_handler(signum, frame):
    stop()

def main():
    signal(SIGTERM, signal_handler)
    signal(SIGINT, signal_handler)
    pwm = NavioPWM()
    pwm.start()
    led = NavioLED(pwm)
    run = True
    status = "sleep"
    current_mode = None
    current_rgb = None
    with open('/home/kherhozen/sources/Navio/Python/conf_led', 'w') as f:
        f.write("2,0,1,0")
    while run:
        with open('/home/kherhozen/sources/Navio/Python/conf_led', 'r') as f:
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
                    with open('/home/kherhozen/sources/Navio/Python/conf_led_status', 'w') as fout:
                        fout.write(status)
                    current_mode = mode
                    current_rgb = rgb
        time.sleep(0.025)
    led.off()
    pwm.shutdown()

if __name__ == '__main__':
    main()
