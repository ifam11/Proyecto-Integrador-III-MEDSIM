from flask import Flask, render_template, request, redirect, url_for
import cv2 as cv
import numpy as np
import matplotlib.pyplot as plt
from keras.models import load_model


app = Flask(__name__)

modelo_guardado = load_model('./models/modelo.h5')
nombres_de_clasificaciones = ['Polera', 'Pantalon', 'Pullover', 'Vestido', 'Abrigo', 'Sandalia', 'Camisa', 'Zapatilla', 'Cartera',
                               'Bota']
def pixel(img):
    img_Ga = cv.GaussianBlur(img, (7, 7), 0)
    img_g = cv.cvtColor(img_Ga, cv.COLOR_BGR2GRAY)
    img_r = cv.resize(img_g, (28, 28), interpolation=cv.INTER_AREA)
    img_i = cv.bitwise_not(img_r)
    return

def plot_image(predictions_array, true_label, img):
    plt.grid(false)
    plt.xticks([])
    plt.yticks([])
    plt.imshow(img, cmap=plt.cm.binary)
    if predicted_label == true_label:
        color = 'blue'  
    else:
        color = 'red'  
    plt.xlabel("{} {:2.0f}% ({})".format(nombres_de_clasificaciones[predicted_label],
                                         100 * np.max(predictions_array),
                                         nombres_de_clasificaciones[true_label]),
               color=color)
def plot_value_array(predictions_array, true_label):
    plt.grid(false)
    plt.xticks(range(len(nombres_de_clasificaciones)), nombres_de_clasificaciones, rotation=45)
    plt.yticks([])
    thisplot = plt.bar(range(len(nombres_de_clasificaciones)), nombres_de_clasificaciones, color="#777777")
    plt.ylim([0, 1])
    predicted_label = np.argmax(predictions_array)
    thisplot[predicted_label].set_color('red')
    thisplot[true_label].set_color('blue')

def predect_image(img):
    img_i = pixel(img)
    img_i = np.expand_dims(img_i, axis=-1)
    img_i = img_i / 255.0 # Normalización
    predictions = modelo_guardado.predict(img_i)
    resultado = np.argmax(predictions[0])
    return predictions, resultado

@app.route('/', methods=['GET', 'POST'])
def index():
    return render_template('index2.html')

@app.route('/predict', methods=['POST'])
def predict():
    file = request.files['file']
    if file:
        img = cv.imdecode(np.frombuffer(file.read(), np.uint8), cv.IMREAD_COLOR)
        predictions, resultado = predect_image(img)
        result_label = nombres_de_clasificaciones[resultado]

        plt.figure(figsize=(12, 6))
        plt.subplot(1, 2, 1)
        plot_image(predictions, resultado, img)
        plt.subplot(1, 2, 2)
        plot_value_array(predictions, resultado)

        plt.tight_layout()
        plt.savefig('static/result.png')

        return render_template('result.html', label=result_label, image_path='static/result.png')
    return redirect(url_for('index'))