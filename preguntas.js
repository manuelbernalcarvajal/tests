// test.js
let currentQuestionIndex = {}; // Objeto para rastrear el índice de la pregunta actual por conjunto
let selectedAnswers = {}; // Objeto para almacenar las respuestas seleccionadas por conjunto
let lastQuestionDiv = null;

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function loadNextQuestion(setName) {
    // Verificar si questionSets está definido
    if (typeof questionSets === 'undefined') {
        console.error("Error: 'questionSets' no está definido. Asegúrate de que 'preguntas.js' se haya cargado correctamente.");
        return;
    }

    if (typeof currentQuestionIndex[setName] !== 'number') {
        // Si es la primera vez que se carga este conjunto, barajar las preguntas
        questionSets[setName] = shuffleArray(questionSets[setName]);
        currentQuestionIndex[setName] = 0;
    }

    if (lastQuestionDiv) {
        checkAnswer(lastQuestionDiv, setName);
    }

    if (currentQuestionIndex[setName] >= questionSets[setName].length) {
        alert("Has completado todas las preguntas de este conjunto.");
        return;
    }

    const questionData = questionSets[setName][currentQuestionIndex[setName]];
    displayQuestion(questionData, setName);
    currentQuestionIndex[setName]++;
}

function displayQuestion(questionData, setName) {
    const quiz = document.getElementById("quiz");
    const questionDiv = document.createElement("div");
    questionDiv.className = "question";

    const questionP = document.createElement("p");
    questionP.textContent = questionData.question;
    questionDiv.appendChild(questionP);

    const optionsDiv = document.createElement("div");
    optionsDiv.className = "options";

    questionData.options.forEach((option, j) => {
        const optionInput = document.createElement("input");
        optionInput.type = "radio";
        optionInput.id = `question${setName}${currentQuestionIndex[setName]}option${j}`;
        optionInput.name = `question${setName}${currentQuestionIndex[setName]}`;
        optionInput.value = option;
        optionInput.onchange = () => {
            selectedAnswers[`${setName}-${currentQuestionIndex[setName]}`] = option;
            lastQuestionDiv = questionDiv; // Actualizar la referencia a la última pregunta mostrada
        };

        const optionLabel = document.createElement("label");
        optionLabel.htmlFor = optionInput.id;
        optionLabel.textContent = option;

        optionsDiv.appendChild(optionInput);
        optionsDiv.appendChild(optionLabel);
        optionsDiv.appendChild(document.createElement("br"));
    });

    questionDiv.appendChild(optionsDiv);
    quiz.appendChild(questionDiv);
}

function checkAnswer(questionDiv, setName) {
    const questionIndex = currentQuestionIndex[setName] - 1;
    const questionData = questionSets[setName][questionIndex];
    const selectedAnswerKey = `${setName}-${questionIndex}`;
    const isCorrect = selectedAnswers[selectedAnswerKey] === questionData.options[questionData.answer];

    let resultSpan = questionDiv.querySelector('.result');
    if (!resultSpan) {
        resultSpan = document.createElement("span");
        resultSpan.className = "result";
        questionDiv.appendChild(resultSpan);
    }

    resultSpan.textContent = ` - ${isCorrect ? "Correcto" : "Incorrecto"}`;
    resultSpan.style.color = isCorrect ? "green" : "red";

    // Deshabilitar opciones después de responder
    const inputs = questionDiv.querySelectorAll('input');
    inputs.forEach(input => input.disabled = true);
}