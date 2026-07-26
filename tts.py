import sys
import pyttsx3

def generar_audio(texto, salida):
    engine = pyttsx3.init()
    engine.setProperty('rate', 145)
    engine.setProperty('volume', 1.0)

    voces = engine.getProperty('voices')
    for voz in voces:
        if 'spanish' in voz.name.lower() or 'es' in voz.id.lower():
            engine.setProperty('voice', voz.id)
            break

    engine.save_to_file(texto, salida)
    engine.runAndWait()

if __name__ == '__main__':
    texto = sys.argv[1]
    salida = sys.argv[2]
    generar_audio(texto, salida)
