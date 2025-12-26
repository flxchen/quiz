let quizzes = [];
let userAnswers = [];
let wrong = [];
let index = 0;
let score = 0;
var counter = 0;
let submit_btn = document.getElementById("submit-btn");
let reset_btn = document.getElementById("reset-btn");
let rawInput = document.getElementById("rawInput");
let count = document.getElementById("count");
let total = document.getElementById("total");
let quizBox = document.getElementById("quizBox");
let quizContent = document.getElementById("quizContent");
let result = document.getElementById("result");
let quizQuestion = document.getElementById("quizQuestion");
let current = document.getElementById("current");
let grade = document.getElementById("grade");
let finalScore = document.getElementById("finalScore");
const help = document.getElementById("formatHelp");
const img = document.getElementById("movingImage");
const viewportWidth = window.innerWidth;
const viewportHeight = window.innerHeight;
let x = 0;
let y = 0;

let dx = 0.5; // horizontal speed
let dy = 0.5; // vertical speed
const MOVE_DURATION = 6000; 

function toggleFormat() {
  help.classList.toggle("hidden");
}
function pickImage() {
  const now = new Date();
  const month = now.getMonth(); // Months are 0-indexed (Jan is 0)
  const day = now.getDate();
    const holidayImg="me.png";
    const defaultimg="congrat.png";
  // Define the logic: Dec 25-31 OR Jan 1-2
  const isHolidayRange = (month === 11 && day > 24) || (month === 1 && day < 3);
  if (isHolidayRange) {
    img.src = holidayImg; // Holiday image
  } else {
    img.src = defaultimg; // Default image
  }
}
//move image
function moveAcrossPage() {
  const startTime = performance.now();
  img.classList.toggle("hidden");
  intervalId = setInterval(() => {
    // Stop movement
    const elapsed = performance.now() - startTime;
    if (elapsed >= MOVE_DURATION) {
      clearInterval(intervalId);
      intervalId = null;
      img.classList.toggle("hidden");
      return;
    }

    const imgWidth = img.offsetWidth;
    const imgHeight = img.offsetHeight;

    x += dx;
    y += dy;

    // Right edge
    if (x + imgWidth >= viewportWidth) {
      dx *= -1;
    }

    // Left edge
    if (x <= 0) {
      dx *= -1;
    }

    // Top edge
    if (y - 2*imgHeight <= -viewportHeight) {
      dy *= -1;
    }

    // Bottom edge
    if (y > imgHeight) {
      dy *= -1;
    }
    img.style.transform = `translate(${x}px, ${y}px)`;
  });
}

async function loadDailyQuestion() {
  const today = new Date().toISOString().split("T")[0];
  const savedDate = localStorage.getItem("dailyQuestionDate");
  const savedQuestion = localStorage.getItem("dailyQuestionText");

  if (savedDate === today && savedQuestion) {
    alert("You have attempted the daily question, try again tomorrow :)");
    return;
  }

  try {
    const rawUrl = "https://gist.githubusercontent.com/flxchen/a60b4e0aee8fa75e9e6ac9297d45359f/raw/99f92566246348d3c7bf8f480d62efd8417f8a3c/question";
    const response = await fetch(rawUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
    const text = await response.text();

    // Split questions
    const blocks = text.split(/(?=The Question)/i);
    const randomBlock = blocks[Math.floor(Math.random() * blocks.length)];
    localStorage.setItem("dailyQuestionDate", today);
    localStorage.setItem("dailyQuestionText", randomBlock);
    rawInput.value = randomBlock;
    parseQuestion();
    startQuiz();
    scrollToBottom(quizBox);
  } catch (err) {
    alert("Failed to load daily question file");
    console.error(err);
  }
}
function scrollToBottom(input){
    input.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
}
function parseQuestion() {
  pickImage();
  const text = rawInput.value.trim();
  if (!text) {
    alert("empty question...");
    return;
  }
  const blocks = text.split(/(?=The Question)/i);
  blocks.forEach((block) => {
    counter++;
    // Detect multiple correct answers
    const isMulti = /The Question\s*\(multiple correct answers\)/i.test(block);
    // Question block (The Question → The Answer)
    const questionMatch = block.match(
      /The Question[\s\S]*?:\s*([\s\S]*?)The Answer:/i
    );
    let questionBlock;
    let question;
    if (questionMatch) {
      questionBlock = questionMatch[1].trim();
      // Question text without options
      question = questionBlock.split(/\n\s*[A-Z]\./)[0].trim();
    } else {
      alert("Could not find question " + counter + " question section");
    }

    // Extract options (A. B. C. ...)
    const optionRegex = /\s*([A-Z])\.\s*([\s\S]*?)(?=(?:\r?\n)?\s*[A-Z]\.|$)/g;
    let options = {};
    let expectedCharCode = "A".charCodeAt(0);
    let match;
    while ((match = optionRegex.exec(questionBlock)) !== null) {
      // Enforce consecutive order
      if (match[1].charCodeAt(0) === expectedCharCode) {
        options[match[1]] = match[2].trim();
        expectedCharCode++; // move to next expected letter
      }
    }
    //enforce option correct format
    if (Object.values(options).length < 1) {
      alert("Could not find question " + counter + " option section");
    }

    // Answer block (The Answer → The Explanation)
    const answerMatch = block.match(
      /The Answer:\s*([\s\S]*?)The Explanation:/i
    );

    let answers = [];
    //enforce answer is in correct format
    if (answerMatch && answerMatch[1]) {
      const matches = answerMatch[1].match(/[A-Z]\./g);
      if (matches) {
        answers = matches.map((l) => l.replace(".", ""));
        const correct = answers.every((key) => key in options);
        if (!correct) {
          alert(
            "question " +
              counter +
              " has answers not belong to question options"
          );
        }
      } else {
        alert("question " + counter + " answer is wrong format");
      }
    } else {
      alert("cannot find question " + counter + " answer section");
    }
    // Explanation
    const explanationMatch = block.match(
      /The Explanation:\s*([\s\S]*?)(The Objective:)/i
    );
    const explanation = explanationMatch ? explanationMatch[1].trim() : "";

    // Objective (from The Objective: to end)
    const objectiveMatch = block.match(/The Objective:\s*([\s\S]*)$/i);
    const objective = objectiveMatch ? objectiveMatch[1].trim() : "";
    quizzes.push({
      question,
      options,
      answers,
      explanation,
      objective,
      multi: isMulti,
    });
  });

  count.textContent = quizzes.length;
  rawInput.value = "";
}

function startQuiz() {
  if (quizzes.length === 0) {
    alert("No questions loaded");
    return;
  }

  total.textContent = quizzes.length;
  quizBox.classList.remove("hidden");
  submit_btn.classList.add("hidden");
  loadQuestion();
}

function loadQuestion() {
  const q = quizzes[index];
  const hasMulti = q.multi;
  const qLength = q.answers.length;
  quizContent.classList.remove("hidden");
  result.classList.add("hidden");
  reset_btn.classList.add("hidden");
  submit_btn.classList.add("hidden");

  quizQuestion.textContent =
    qLength > 1 ? q.question + ` (select ${qLength})` : q.question;
  current.textContent = index + 1;
  options.innerHTML = "";

  for (let key in q.options) {
    if (userAnswers[index]) {
      var checked = userAnswers[index].includes(key) ? "checked" : "";
    }
    const inputType = hasMulti === true ? "checkbox" : "radio";
    const nameAttr = hasMulti === true ? "" : `name=${index}`;
    options.innerHTML += outputOption(
      inputType,
      key,
      nameAttr,
      checked,
      index,
      q,
      ""
    );
  }

  if (index == quizzes.length - 1) {
    submit_btn.classList.remove("hidden");
  }
  scrollToBottom(quizBox);
}
function handleAnswerChange(questionIndex, optionKey, input) {
  if (!input) return;
  if (input.type == "radio") {
    userAnswers[questionIndex] = [optionKey];
  } else {
    let check = input.checked;
    if (!userAnswers[questionIndex]) {
      userAnswers[questionIndex] = [];
    }

    // Add option if checked
    if (check) {
      if (!userAnswers[questionIndex].includes(optionKey)) {
        userAnswers[questionIndex].push(optionKey);
      }
    } else {
      // Remove option if unchecked
      userAnswers[questionIndex] = userAnswers[questionIndex].filter(
        (key) => key !== optionKey
      );
    }
  }
}
function submitAnswer() {
  //remove last question
  quizContent.classList.add("hidden");
  reset_btn.classList.remove("hidden");
  score = 0;
  result.innerHTML = "";
  //grade question
  quizzes.forEach((quiz, qIndex) => {
    const userSelected = userAnswers[qIndex] || [];
    const correctAnswers = quiz.answers;
    const qLength = quiz.answers.length;

    const isCorrect =
      userSelected.length === correctAnswers.length &&
      userSelected.every((a) => correctAnswers.includes(a));

    if (isCorrect) score++;
    else {
      wrong.push(qIndex);
    }
    const icon = isCorrect
      ? `<span class="correct-icon">✅</span>`
      : `<span class="wrong-icon">❌</span>`;
    const context =
      qLength > 1 ? quiz.question + ` (SELECT ${qLength})` : quiz.question;
    result.innerHTML += `
      <div class="quiz-result">
        <h4>Question ${qIndex + 1}${icon}</h4>
        <p> ${context}</p>
      ${load_Question(quiz, qIndex)}
        <p><strong>Your Answer:</strong> ${
          userSelected.join(", ") || "None"
        }</p>
        <p><strong>Correct Answer:</strong> ${correctAnswers.join(", ")}</p>
        <p><strong>Explanation:</strong> ${quiz.explanation}</p>
        <p><strong>Objective:</strong> ${quiz.objective}</p>
        <hr />
      </div>
    `;
  });
  // Final grade
  let s = ((score / quizzes.length) * 100).toFixed(2);
  grade.textContent = score + "/" + quizzes.length + ": " + s;
  result.classList.remove("hidden");
  finalScore.classList.remove("hidden");
  scrollToBottom(finalScore);
  //show animation for perferct score
  if (s === "100.00") {
    grade.textContent+=" PERFECT!";
    moveAcrossPage();
  }
  if (wrong.length > 0) {
    let cotent = `<p>You incorrectly answered one or more questions in the following objective areas:</p>`;
    report.classList.remove("hidden");
    report.innerHTML += cotent;
    wrong.forEach((value) => {
      report.innerHTML += `<p><strong>Question:</strong> ${
        value + 1
      }</p><strong> Objective:</strong>${quizzes[value].objective}</p>`;
    });
  }
}
//show all answered questions
function load_Question(question, index) {
  let html = "";
  for (let key in question.options) {
    const checked =
      userAnswers[index] && userAnswers[index].includes(key) ? "checked" : "";
    const inputType = question.multi === true ? "checkbox" : "radio";
    const nameAttr = question.multi === true ? "" : `name=${index}`;
    html += outputOption(
      inputType,
      key,
      nameAttr,
      checked,
      index,
      question,
      "disabled"
    );
  }

  return html;
}
//build question options
function outputOption(inputType, key, nameAttr, checked, index, q, disabled) {
  let option = `<div class="options">        
          <label><input type="${inputType}" ${disabled} ${nameAttr} ${checked} onchange="handleAnswerChange(${index}, '${key}', this)"> ${key}. ${q.options[key]}</label>
        </div>`;
  return option;
}
function reset() {
  userAnswers = [];
  wrong = [];
  localStorage.clear();
  // Reset score
  score = 0;
  index = 0;
  // Hide result display
  result.innerHTML = "";
  report.innerHTML = "";
  report.classList.add("hidden");
  result.classList.add("hidden");
  finalScore.classList.add("hidden");
  grade.textContent = "";
  loadQuestion();
}
function nextQuestion() {
  if (index < quizzes.length - 1) {
    index++;
    loadQuestion();
  }
}

function prevQuestion() {
  if (index > 0) {
    index--;
    loadQuestion();
  }
}
