const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, '../public')));

let duelQueue = [];
let games = {};
let vocab = [];

try {
  vocab = JSON.parse(fs.readFileSync(path.join(__dirname, '../vocab.json')));
} catch (err) {
  console.error('Failed to load vocab.json:', err.message);
}
function getRandomTerm() {
  const index = Math.floor(Math.random() * vocab.length);
  return vocab[index];
}

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  duelQueue.push(socket.id);

  if (duelQueue.length >= 2) {
    const [player1, player2] = duelQueue.splice(0, 2);
    const room = `room-${player1}-${player2}`;
    socket.join(room);
    io.sockets.sockets.get(player2)?.join(room);

    games[room] = {
      players: { [player1]: 0, [player2]: 0 },
      currentQuestion: null,
      answered: false,
      timer: null,
    };

    startRound(room);
  }

  socket.on('submitAnswer', ({ room, playerId, answer }) => {
    const game = games[room];
    if (!game || game.answered) return;

    const correctAnswer = game.currentQuestion.term.toLowerCase();
    const isCorrect = answer.toLowerCase() === correctAnswer;

    if (isCorrect) {
      game.answered = true;
      clearTimeout(game.timer);
      game.players[playerId] += 1;

      io.to(room).emit('answerResult', {
        playerId,
        answer,
        correct: true,
        scores: game.players
      });

      const winner = Object.entries(game.players).find(([_, score]) => score >= 3);
      if (winner) {
        io.to(room).emit('gameOver', { winner: winner[0] });
        delete games[room];
      } else {
        setTimeout(() => startRound(room), 2000);
      }
    } else {
      socket.emit('answerResult', {
        playerId,
        answer,
        correct: false,
        scores: game.players
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    duelQueue = duelQueue.filter(id => id !== socket.id);

    for (const room in games) {
      if (games[room].players[socket.id] !== undefined) {
        io.to(room).emit('playerLeft', { playerId: socket.id });
        clearTimeout(games[room].timer);
        delete games[room];
      }
    }
  });
});

function startRound(room) {
  const game = games[room];
  if (!game) return;

  const question = getRandomTerm();
  game.currentQuestion = question;
  game.answered = false;

  io.to(room).emit('duelStart', { room, question, scores: game.players });

  game.timer = setTimeout(() => {
    if (!game.answered) {
      io.to(room).emit('roundTimeout', { correctAnswer: question.term });
      setTimeout(() => startRound(room), 2000);
    }
  }, 10000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
