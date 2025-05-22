let vocabList = [];
let correctAnswer = '';
let timer;
let timeLeft = 15;

const questionEl = document.getElementById('question');
const answerEl = document.getElementById('answer');
const timerEl = document.getElementById('timer');
const resultEl = document.getElementById('result');
const newRoundBtn = document.getElementById('new-round');

fetch('../vocab.json')
  .then(res => res.json())
  .then(data => {
    vocabList = data;
    startRound();
  });

function startRound() {
  resultEl.innerText = '';
  newRoundBtn.style.display = 'none';
  answerEl.value = '';
  answerEl.disabled = false;
  timeLeft = 15;
  timerEl.innerText = `Time: ${timeLeft}`;

  const random = vocabList[Math.floor(Math.random() * vocabList.length)];
  questionEl.innerText = `Definition: ${random.definition}`;
  correctAnswer = random.term.toLowerCase();

  timer = setInterval(() => {
    timeLeft--;
    timerEl.innerText = `Time: ${timeLeft}`;
    if (timeLeft <= 0) {
      clearInterval(timer);
      endRound(false);
    }
  }, 1000);
}

function endRound(success) {
  answerEl.disabled = true;
  newRoundBtn.style.display = 'inline-block';
  resultEl.innerText = success
    ? 'Correct! Well done.'
    : `Time's up! The correct answer was "${correctAnswer}".`;
}

answerEl.addEventListener('keyup', (e) => {
  if (e.key === 'Enter') {
    const userAnswer = answerEl.value.trim().toLowerCase();
    if (userAnswer === correctAnswer) {
      clearInterval(timer);
      endRound(true);
    } else {
      resultEl.innerText = `Wrong! Try again.`;
    }
  }
});

newRoundBtn.addEventListener('click', () => {
  startRound();
});
