import spidev
import time

# Constantes du MPU9250
MPU9250_ADDRESS = 0x68  # Adresse I2C (souvent ignorée en SPI, mais utile pour les registres)
WHO_AM_I_REG = 0x75  # Registre WHO_AM_I du MPU9250 (devrait retourner 0x71)
READ_FLAG = 0x80     # Le bit 7 (MSB) doit être mis à 1 pour une opération de lecture en SPI

# Configuration SPI
BUS = 0     # Bus SPI (souvent 0 ou 1 sur Raspberry Pi)
DEVICE = 1  # Chip Select (CS) (souvent 0 ou 1)
# NOTE: Le MPU9250 supporte des vitesses SPI jusqu'à 1MHz pour tous les registres
# et jusqu'à 20MHz pour les registres de données et d'interruption.

# Initialisation de l'objet SPI
spi = spidev.SpiDev()

try:
    # Ouvre la connexion SPI (Bus, Device/CS)
    spi.open(BUS, DEVICE)

    # Configuration des paramètres SPI
    spi.max_speed_hz = 1000000  # Vitesse max à 1 MHz (sûr pour tous les registres)
    spi.mode = 0b00             # Mode SPI 0 (CPOL=0, CPHA=0) pour le MPU9250

    print("Connexion SPI établie.")

    # --- Lecture du registre WHO_AM_I (0x75) ---

    # Adresse du registre à lire avec le bit de lecture (0x80)
    # Adresse de lecture = 0x75 | 0x80 = 0xF5
    register_to_read = WHO_AM_I_REG | READ_FLAG

    # Envoyer l'adresse du registre, puis envoyer un octet fictif (0x00) pour recevoir la donnée en retour
    # xfer renvoie les données reçues sous forme de liste
    response = spi.xfer2([register_to_read, 0x00])

    # Le premier élément de la réponse est généralement l'écho de l'adresse (ou est ignoré),
    # le deuxième élément est la donnée lue (WHO_AM_I)
    who_am_i_value = response[1]

    print(f"WHO_AM_I lu (0x{register_to_read:02X}) : 0x{who_am_i_value:02X}")

    # Vérification : la valeur attendue est 0x71
    if who_am_i_value == 0x71:
        print("Communication avec le MPU9250 réussie (WHO_AM_I = 0x71).")
    else:
        print(f"Erreur de communication : valeur inattendue. Attendue : 0x71.")

finally:
    # Ferme la connexion SPI
    spi.close()
    print("Connexion SPI fermée.")