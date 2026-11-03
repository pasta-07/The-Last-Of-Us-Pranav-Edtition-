const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const healthDisplay = document.getElementById("health");
const scoreDisplay = document.getElementById("score");
const startScreen = document.getElementById("startScreen");
const startBtn = document.getElementById("startBtn");

let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 13,
    speed: 4,
    health: 100
};

let enemies = [];
let bullets = [];
let medkits = [];
let bushes = [];
let spawnTimer = 0;
let medkitTimer = 0;
let shootTimer = 0;
let score = 0;
let isGameStarted = false;
let isGameOver = false;

let alertTimer = 0;
let currentAlertText = "";
let lastAnnouncedLevel = 1;

const keys = {};

function generateForestBushes() {
    bushes = [];
    
    for (let x = 20; x < canvas.width; x += 40) {
        bushes.push({ x: x, y: 15, size: 22 });
        bushes.push({ x: x, y: canvas.height - 15, size: 22 });
    }
    for (let y = 20; y < canvas.height; y += 40) {
        bushes.push({ x: 15, y: y, size: 22 });
        bushes.push({ x: canvas.width - 15, y: y, size: 22 });
    }

    for (let i = 0; i < 12; i++) {
        bushes.push({
            x: 100 + Math.random() * (canvas.width - 200),
            y: 80 + Math.random() * (canvas.height - 160),
            size: 25 + Math.random() * 15
        });
    }
}

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'shoot') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(30, audioCtx.currentTime + 0.12);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
    } else if (type === 'heal') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
    }
}

startBtn.addEventListener("click", function() {
    startScreen.style.display = "none";
    document.getElementById("hud").style.display = "flex";
    isGameStarted = true;
    generateForestBushes();
});

window.addEventListener("keydown", function(event) {
    keys[event.key.toLowerCase()] = true;

    if (event.key === " " && isGameOver) {
        resetGame();
    }

    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(event.key.toLowerCase())) {
        event.preventDefault();
    }
});

window.addEventListener("keyup", function(event) {
    keys[event.key.toLowerCase()] = false;
});

function resetGame() {
    player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: 13,
        speed: 4,
        health: 100
    };
    enemies = [];
    bullets = [];
    medkits = [];
    spawnTimer = 0;
    medkitTimer = 0;
    shootTimer = 0;
    score = 0;
    isGameOver = false;
    alertTimer = 0;
    currentAlertText = "";
    lastAnnouncedLevel = 1;
    generateForestBushes();
}

function drawArena() {
    ctx.fillStyle = "#070b08";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#0e1610";
    ctx.lineWidth = 2;
    for (let x = 0; x < canvas.width; x += 100) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 30, canvas.height);
        ctx.stroke();
    }

    for (let i = 0; i < bushes.length; i++) {
        let b = bushes[i];
        ctx.save();
        ctx.fillStyle = "#1b2a1e";
        ctx.strokeStyle = "#38593d";
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(b.x - b.size * 0.3, b.y, b.size * 0.6, 0, Math.PI * 2);
        ctx.arc(b.x + b.size * 0.3, b.y - b.size * 0.2, b.size * 0.5, 0, Math.PI * 2);
        ctx.arc(b.x, b.y + b.size * 0.2, b.size * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    const nightGlow = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 40,
        canvas.width / 2, canvas.height / 2, 400
    );
    nightGlow.addColorStop(0, "rgba(45, 75, 55, 0.08)");
    nightGlow.addColorStop(1, "rgba(3, 5, 4, 0.5)");

    ctx.fillStyle = nightGlow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function updatePlayer() {
    if (keys["w"] || keys["arrowup"]) player.y -= player.speed;
    if (keys["s"] || keys["arrowdown"]) player.y += player.speed;
    if (keys["a"] || keys["arrowleft"]) player.x -= player.speed;
    if (keys["d"] || keys["arrowright"]) player.x += player.speed;

    player.x = Math.max(player.radius + 15, Math.min(canvas.width - player.radius - 15, player.x));
    player.y = Math.max(player.radius + 15, Math.min(canvas.height - player.radius - 15, player.y));
}

function drawPlayer() {
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 9, player.radius + 3, player.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fill();

    ctx.save();
    ctx.shadowColor = "#e5e5da";
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#3e423b";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#e5e5e5";
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(player.x, player.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#a72b32";
    ctx.fill();
}

function getClosestEnemy() {
    if (enemies.length === 0) return null;
    
    let closest = enemies[0];
    let minDist = Math.hypot(player.x - closest.x, player.y - closest.y);

    for (let i = 1; i < enemies.length; i++) {
        const dist = Math.hypot(player.x - enemies[i].x, player.y - enemies[i].y);
        if (dist < minDist) {
            minDist = dist;
            closest = enemies[i];
        }
    }
    return closest;
}

function updateWeapons() {
    shootTimer++;

    let fireRate = Math.max(12, 35 - Math.floor(score / 15));

    if (shootTimer > fireRate) {
        const target = getClosestEnemy();
        if (target) {
            const angle = Math.atan2(target.y - player.y, target.x - player.x);
            const bulletSpeed = 7;
            bullets.push({
                x: player.x,
                y: player.y,
                speed: bulletSpeed,
                dx: Math.cos(angle) * bulletSpeed,
                dy: Math.sin(angle) * bulletSpeed,
                radius: 3.5
            });
            playSound('shoot');
        }
        shootTimer = 0;
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].x += bullets[i].dx;
        bullets[i].y += bullets[i].dy;

        if (bullets[i].x < 0 || bullets[i].x > canvas.width || bullets[i].y < 0 || bullets[i].y > canvas.height) {
            bullets.splice(i, 1);
            continue;
        }

        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            const dist = Math.hypot(bullets[i].x - enemy.x, bullets[i].y - enemy.y);
            
            if (dist < bullets[i].radius + enemy.radius) {
                bullets.splice(i, 1);
                enemies.splice(j, 1);
                score += 10;
                playSound('hit');
                checkInfiniteProgression();
                break;
            }
        }
    }
}

function checkInfiniteProgression() {
    let currentLevel = Math.floor(score / 100) + 1;

    if (currentLevel > lastAnnouncedLevel) {
        lastAnnouncedLevel = currentLevel;
        alertTimer = 120;
        currentAlertText = `LEVEL ${currentLevel}: INFECTION SPREADS`;
    }
}

function drawBullets() {
    ctx.fillStyle = "#f39c12";
    for (let i = 0; i < bullets.length; i++) {
        ctx.beginPath();
        ctx.arc(bullets[i].x, bullets[i].y, bullets[i].radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function spawnMedkit() {
    medkits.push({
        x: 70 + Math.random() * (canvas.width - 140),
        y: 70 + Math.random() * (canvas.height - 140),
        radius: 9,
        healAmount: 25
    });
}

function updateMedkits() {
    medkitTimer++;
    if (medkitTimer > 480) {
        spawnMedkit();
        medkitTimer = 0;
    }

    for (let i = medkits.length - 1; i >= 0; i--) {
        const kit = medkits[i];
        const dist = Math.hypot(player.x - kit.x, player.y - kit.y);

        if (dist < player.radius + kit.radius) {
            player.health += kit.healAmount;
            if (player.health > 100) player.health = 100;
            medkits.splice(i, 1);
            playSound('heal');
        }
    }
}

function drawMedkits() {
    for (let i = 0; i < medkits.length; i++) {
        const kit = medkits[i];

        ctx.save();
        ctx.shadowColor = "#2ecc71";
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.arc(kit.x, kit.y, kit.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#1e4d2b";
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#2ecc71";
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = "#2ecc71";
        ctx.fillRect(kit.x - 4, kit.y - 1.5, 8, 3);
        ctx.fillRect(kit.x - 1.5, kit.y - 4, 3, 8);
    }
}

function spawnEnemy() {
    let x, y;
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? 20 : canvas.width - 20;
        y = Math.random() * canvas.height;
    } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? 20 : canvas.height - 20;
    }

    let baseSpeed = 1.9 + Math.min(2.8, score / 220);

    enemies.push({
        x: x,
        y: y,
        radius: 11,
        speed: baseSpeed + Math.random() * 0.8,
        color: "#a72b32"
    });
}

function updateEnemies() {
    spawnTimer++;

    let spawnRate = Math.max(15, 40 - Math.floor(score / 10));

    if (spawnTimer > spawnRate) {
        spawnEnemy();
        spawnTimer = 0;
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.x += Math.cos(angle) * enemy.speed;
        enemy.y += Math.sin(angle) * enemy.speed;

        const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (dist < player.radius + enemy.radius) {
            player.health -= 0.8;
            if (player.health <= 0) {
                player.health = 0;
                isGameOver = true;
            }
        }
    }
}

function drawEnemies() {
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];

        ctx.beginPath();
        ctx.ellipse(enemy.x, enemy.y + 8, enemy.radius + 2, enemy.radius * 0.4, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#591c20";
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#c23a42";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#ff1a25";
        ctx.fill();
    }
}

function drawLevelPopup() {
    if (alertTimer > 0) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
        ctx.fillRect(0, canvas.height / 2 - 50, canvas.width, 100);

        ctx.fillStyle = "#ff1a25";
        ctx.font = "900 24px Arial";
        ctx.textAlign = "center";
        ctx.fillText(currentAlertText, canvas.width / 2, canvas.height / 2 - 8);

        ctx.fillStyle = "#ffffff";
        ctx.font = "13px Arial";
        ctx.fillText("KEEP MOVING. SURVIVE.", canvas.width / 2, canvas.height / 2 + 22);
        
        alertTimer--;
    }
}

function drawGameOver() {
    ctx.fillStyle = "rgba(9, 10, 9, 0.88)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#a72b32";
    ctx.font = "900 36px Arial";
    ctx.textAlign = "center";
    ctx.fillText("YOU DIED", canvas.width / 2, canvas.height / 2 - 20);

    ctx.fillStyle = "#b1b2a9";
    ctx.font = "14px Arial";
    ctx.fillText("PRESS SPACEBAR TO RESTART", canvas.width / 2, canvas.height / 2 + 25);
}

function gameLoop() {
    drawArena();

    if (isGameStarted && !isGameOver) {
        updatePlayer();
        updateMedkits();
        updateWeapons();
        updateEnemies();
        
        drawMedkits();
        drawEnemies();
        drawBullets();
        drawPlayer();
        drawLevelPopup();
    } else if (isGameOver) {
        drawEnemies();
        drawGameOver();
    }

    healthDisplay.textContent = Math.ceil(player.health) + " HP";
    scoreDisplay.textContent = score;

    requestAnimationFrame(gameLoop);
}

gameLoop();