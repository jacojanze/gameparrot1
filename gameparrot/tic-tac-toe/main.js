const backendUrl = "http://127.0.0.1:5000/api/chatbox";

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let board;
let boardPosition = { x: 250, y: 150 }; // Positioned to center the board vertically

function preload() {
    this.load.image('background', '/assets/background.png');
    this.load.image('board', '/assets/board.png');
    this.load.image('x', '/assets/x.png');
    this.load.image('o', '/assets/o.png');
}

function create() {
    this.add.image(400, 300, 'background'); // Center the background
    board = this.add.image(boardPosition.x + 150, boardPosition.y + 150, 'board');

    board.setInteractive();
    board.on('pointerdown', handleClick, this);
}

function handleClick(pointer) {
    const x = pointer.x - boardPosition.x;
    const y = pointer.y - boardPosition.y;

    const row = Math.floor(y / 100);
    const col = Math.floor(x / 100);

    if (row >= 0 && row < 3 && col >= 0 && col < 3) {
        makeMove(row, col);
    }
}

function makeMove(row, col) {
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('game_id');
    const userId = urlParams.get('user_id');
    const password = urlParams.get('password');
    const chatId = urlParams.get('chat_id');

    const moveData = {
        row: row,
        col: col
    };

    fetch(backendUrl+`/sendMessage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            user_id: userId,
            password: password,
            chat_id: chatId,
            message: `GameParrot(move, ${gameId}, ${JSON.stringify(moveData)})`
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.SUCCESS) {
            // Handle success, possibly updating the board based on the new state
            updateBoard(row, col);
        } else {
            // Handle error
            console.error(data.error);
        }
    });
}

function updateBoard(row, col) {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user_id');

    fetch(backendUrl+`/sendMessage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            user_id: userId,
            password: password,
            chat_id: chatId,
            message: `GameParrot(information, ${gameId}, ${userId})`
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.SUCCESS) {
            const gameData = data.info.gameData.board;
            gameData.forEach((row, rIdx) => {
                row.forEach((cell, cIdx) => {
                    const xPos = boardPosition.x + cIdx * 100 + 50;
                    const yPos = boardPosition.y + rIdx * 100 + 50;

                    if (cell === 1) {
                        this.add.image(xPos, yPos, 'x');
                    } else if (cell === 2) {
                        this.add.image(xPos, yPos, 'o');
                    }
                });
            });
        }
    });
}

function update() {}