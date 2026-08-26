import React, {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import "./styles.css";

type Player = "ninjacat" | "manyu";
type Screen = "menu" | "playing" | "gameover";

type BallState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  shooting: boolean;
  scored: boolean;
  startedAt: number;
};

const GAME_TIME = 30;
const GRAVITY = 1750;

export default function App() {
  const gameRef = useRef<HTMLDivElement | null>(null);
  const hoopRef = useRef<HTMLImageElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);

  const [screen, setScreen] = useState<Screen>("menu");
  const [player, setPlayer] = useState<Player>("ninjacat");

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);

  const [hoopLeft, setHoopLeft] = useState(50);

  const [message, setMessage] = useState("");
  const [swish, setSwish] = useState(false);

  const [ballRender, setBallRender] = useState({
    x: 0,
    y: 0,
    visible: false,
    rotation: 0,
  });

  const ballRef = useRef<BallState>({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    shooting: false,
    scored: false,
    startedAt: 0,
  });

  const pointerStart = useRef({
    x: 0,
    y: 0,
    active: false,
  });

  const screenRef = useRef<Screen>("menu");
  const scoreRef = useRef(0);
  const comboRef = useRef(0);

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    comboRef.current = combo;
  }, [combo]);

  /* ========================================
     BALL SIZE
  ======================================== */

  const getBallSize = useCallback(() => {
    const width =
      gameRef.current?.clientWidth ?? window.innerWidth;

    if (width <= 520) {
      return Math.max(58, Math.min(76, width * 0.16));
    }

    return Math.max(68, Math.min(90, width * 0.1));
  }, []);

  /* ========================================
     BALL STARTING POSITION
     Raised shooting hand
  ======================================== */

  const getBallStart = useCallback(() => {
    const game = gameRef.current;

    if (!game) {
      return { x: 0, y: 0 };
    }

    const w = game.clientWidth;
    const h = game.clientHeight;

    if (player === "ninjacat") {
      return {
        x: w * 0.655,
        y: h * 0.615,
      };
    }

    return {
      x: w * 0.655,
      y: h * 0.615,
    };
  }, [player]);

  const resetBall = useCallback(() => {
    const start = getBallStart();

    ballRef.current = {
      x: start.x,
      y: start.y,
      vx: 0,
      vy: 0,
      shooting: false,
      scored: false,
      startedAt: 0,
    };

    setBallRender({
      x: start.x,
      y: start.y,
      visible: true,
      rotation: 0,
    });
  }, [getBallStart]);

  /* ========================================
     MESSAGE
  ======================================== */

  const showMessage = useCallback((text: string) => {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 650);
  }, []);

  /* ========================================
     MOVE HOOP
  ======================================== */

  const moveHoop = useCallback(() => {
    const positions = [35, 42, 50, 58, 65];

    setHoopLeft((current) => {
      const choices = positions.filter(
        (position) => Math.abs(position - current) >= 7
      );

      return choices[Math.floor(Math.random() * choices.length)];
    });
  }, []);

  /* ========================================
     SCORE
  ======================================== */

  const registerScore = useCallback(() => {
    const nextScore = scoreRef.current + 1;
    const nextCombo = comboRef.current + 1;

    scoreRef.current = nextScore;
    comboRef.current = nextCombo;

    setScore(nextScore);
    setCombo(nextCombo);
    setBestCombo((old) => Math.max(old, nextCombo));

    setSwish(true);

    window.setTimeout(() => {
      setSwish(false);
    }, 450);

    if (nextCombo >= 5) {
      showMessage(`🔥 ${nextCombo}x COMBO!`);
    } else if (nextCombo >= 3) {
      showMessage(`${nextCombo}x COMBO!`);
    } else {
      showMessage("SWISH! +1");
    }

    /*
      Let the ball visibly fall THROUGH the basket first.
    */

    window.setTimeout(() => {
      if (screenRef.current === "playing") {
        moveHoop();
      }
    }, 250);

    window.setTimeout(() => {
      if (screenRef.current === "playing") {
        resetBall();
      }
    }, 480);
  }, [moveHoop, resetBall, showMessage]);

  /* ========================================
     MISS
  ======================================== */

  const registerMiss = useCallback(() => {
    comboRef.current = 0;
    setCombo(0);

    window.setTimeout(() => {
      if (screenRef.current === "playing") {
        resetBall();
      }
    }, 160);
  }, [resetBall]);

  /* ========================================
     SHOOT
  ======================================== */

  const shootBall = useCallback(
    (
      pointerStartX: number,
      pointerStartY: number,
      pointerEndX: number,
      pointerEndY: number
    ) => {
      if (screenRef.current !== "playing") return;
  
      if (ballRef.current.shooting) return;
  
      const game = gameRef.current;
      const hoop = hoopRef.current;
  
      if (!game || !hoop) return;
  
      const gameRect = game.getBoundingClientRect();
      const hoopRect = hoop.getBoundingClientRect();
  
      const start = getBallStart();
  
      const swipeX = pointerEndX - pointerStartX;
      const swipeY = pointerEndY - pointerStartY;
  
      const upwardSwipe = Math.max(0, -swipeY);
  
      /*
        POWER
  
        Too weak = short.
        Stronger swipe = higher/faster shot.
      */
  
      const power = Math.min(1.25, upwardSwipe / 220);
  
      /*
        Current rim position.
      */
  
      const rimX =
        hoopRect.left -
        gameRect.left +
        hoopRect.width * 0.5;
  
      /*
        Horizontal aim now comes from YOUR swipe.
  
        No automatic lock-on.
      */
  
      const swipeHorizontalVelocity =
        swipeX * 3.1;
  
      /*
        Tiny amount of assistance only.
  
        This nudges toward the basket,
        but absolutely does NOT guarantee a score.
      */
  
      const distanceToHoop =
        rimX - start.x;
  
      const smallAimAssist =
        distanceToHoop * 0.22;
  
      const vx =
        swipeHorizontalVelocity +
        smallAimAssist;
  
      /*
        Vertical shot strength.
        Weak swipe can fall short.
        Hard swipe can overshoot.
      */
  
      const vy =
        -(720 + power * 470);
  
      ballRef.current = {
        x: start.x,
        y: start.y,
        vx,
        vy,
        shooting: true,
        scored: false,
        startedAt: performance.now(),
      };
    },
    [getBallStart]
  );

  /* ========================================
     PHYSICS LOOP
  ======================================== */

  useEffect(() => {
    const frame = (time: number) => {
      const game = gameRef.current;
      const hoop = hoopRef.current;
      const ball = ballRef.current;

      if (
        screenRef.current === "playing" &&
        game &&
        hoop &&
        ball.shooting
      ) {
        if (!lastFrameRef.current) {
          lastFrameRef.current = time;
        }

        let dt = (time - lastFrameRef.current) / 1000;

        dt = Math.min(dt, 0.025);

        const previousY = ball.y;

        ball.vy += GRAVITY * dt;

        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        const shotAge = performance.now() - ball.startedAt;

        setBallRender({
          x: ball.x,
          y: ball.y,
          visible: true,
          rotation: shotAge * 0.25,
        });

        const gameRect = game.getBoundingClientRect();
        const hoopRect = hoop.getBoundingClientRect();

        const rimY =
          hoopRect.top - gameRect.top + hoopRect.height * 0.29;

        const rimX =
          hoopRect.left - gameRect.left + hoopRect.width * 0.5;

        const rimHalfWidth = hoopRect.width * 0.2;

        const ballSize = getBallSize();

        /*
          SCORE ONLY WHEN:
          ball was above rim
          ball crosses rim going downward
          ball is inside basket
        */

        const crossedRim =
          previousY < rimY && ball.y >= rimY && ball.vy > 0;

        const insideBasket =
          Math.abs(ball.x - rimX) <
          rimHalfWidth - ballSize * 0.05;

        if (crossedRim && insideBasket && !ball.scored) {
          ball.scored = true;

          /*
            IMPORTANT:
            DO NOT stop physics here.

            The ball keeps travelling down through the net.
          */

          registerScore();
        }

        /*
          Only count as miss if it never scored.
        */

        if (
          !ball.scored &&
          (ball.y > game.clientHeight + 120 ||
            ball.x < -150 ||
            ball.x > game.clientWidth + 150 ||
            shotAge > 3200)
        ) {
          ball.shooting = false;
          registerMiss();
        }
      }

      lastFrameRef.current = time;

      animationRef.current = requestAnimationFrame(frame);
    };

    animationRef.current = requestAnimationFrame(frame);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [getBallSize, registerMiss, registerScore]);

  /* ========================================
     TIMER
  ======================================== */

  useEffect(() => {
    if (screen !== "playing") return;

    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);

          ballRef.current.shooting = false;

          screenRef.current = "gameover";
          setScreen("gameover");

          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [screen]);

  /* ========================================
     RESIZE
  ======================================== */

  useEffect(() => {
    const handleResize = () => {
      if (
        screenRef.current === "playing" &&
        !ballRef.current.shooting
      ) {
        resetBall();
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [resetBall]);

  /* ========================================
     START GAME
  ======================================== */

  const startGame = () => {
    scoreRef.current = 0;
    comboRef.current = 0;

    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setTimeLeft(GAME_TIME);

    setHoopLeft(50);
    setMessage("");
    setSwish(false);

    screenRef.current = "playing";
    setScreen("playing");

    window.setTimeout(() => {
      resetBall();
    }, 80);
  };

  const backToMenu = () => {
    ballRef.current.shooting = false;

    screenRef.current = "menu";
    setScreen("menu");
  };

  /* ========================================
     POINTER / SWIPE
  ======================================== */

  const handlePointerDown = (
    e: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (screen !== "playing") return;

    if (pointerStart.current.active) return;

    pointerStart.current = {
      x: e.clientX,
      y: e.clientY,
      active: true,
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // nothing
    }
  };

  const handlePointerUp = (
    e: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (
      screen !== "playing" ||
      !pointerStart.current.active
    ) {
      return;
    }

    const start = pointerStart.current;

    pointerStart.current.active = false;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    const distance = Math.hypot(dx, dy);

    if (distance >= 25 && dy < -15) {
      shootBall(
        start.x,
        start.y,
        e.clientX,
        e.clientY
      );
    }
  };

  const handlePointerCancel = () => {
    pointerStart.current.active = false;
  };

  const playerImage =
    player === "ninjacat"
      ? "/ninjacatplayer.png"
      : "/manyuplayer.png";

  const selectImage =
    player === "ninjacat"
      ? "/ninjacatselect.png"
      : "/manyuselect.png";

  const level = Math.floor(score / 5) + 1;

  return (
    <div className="app">
      <div
        ref={gameRef}
        className="game"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <img
          src="/Background2.png"
          className="background"
          alt=""
          draggable={false}
        />

        {/* ==================================
            MENU
        ================================== */}

        {screen === "menu" && (
          <div className="menu-screen">
            <div className="title-area">
              <img
                src="/basketball.png"
                className="title-ball"
                alt=""
              />

              <h1>
                NINJACAT
                <span>BASKETBALL</span>
              </h1>

              <p>CHOOSE YOUR FIGHTER</p>
            </div>

            <div className="player-select">
              <button
                className={`player-card ninja-card ${
                  player === "ninjacat" ? "selected" : ""
                }`}
                onClick={() => setPlayer("ninjacat")}
              >
                <img
                  src="/ninjacatselect.png"
                  alt="NinjaCat"
                />

                <div className="player-name">
                  NINJACAT
                </div>

                <div className="player-colour">
                  RED TEAM
                </div>
              </button>

              <button
                className={`player-card manyu-card ${
                  player === "manyu" ? "selected" : ""
                }`}
                onClick={() => setPlayer("manyu")}
              >
                <img
                  src="/manyuselect.png"
                  alt="Manyu"
                />

                <div className="player-name">
                  MANYU
                </div>

                <div className="player-colour">
                  BLUE TEAM
                </div>
              </button>
            </div>

            <button
              className="start-button"
              onClick={startGame}
            >
              START GAME
            </button>

            <div className="menu-instruction">
              SWIPE UP TO SHOOT
            </div>
          </div>
        )}

        {/* ==================================
            GAME
        ================================== */}

        {screen === "playing" && (
          <>
            <div className="hud">
              <div className="hud-box">
                <span>SCORE</span>
                <strong>{score}</strong>
              </div>

              <div className="hud-box timer-box">
                <span>TIME</span>

                <strong
                  className={
                    timeLeft <= 5 ? "danger-time" : ""
                  }
                >
                  {timeLeft}
                </strong>
              </div>

              <div className="hud-box">
                <span>COMBO</span>

                <strong>
                  {combo > 0 ? `${combo}x` : "-"}
                </strong>
              </div>
            </div>

            <div className="level-display">
              LEVEL {level}
            </div>

            <div
              className={`hoop-wrap ${
                swish ? "hoop-swish" : ""
              }`}
              style={{
                left: `${hoopLeft}%`,
              }}
            >
              <img
                ref={hoopRef}
                src="/hoop.png"
                className="hoop"
                alt=""
              />

              {swish && (
                <div className="swish-effects">
                  <span className="spark spark1" />
                  <span className="spark spark2" />
                  <span className="spark spark3" />
                  <span className="spark spark4" />
                  <span className="spark spark5" />
                  <span className="spark spark6" />

                  <div className="rim-flash" />
                </div>
              )}
            </div>

            <img
              src={playerImage}
              className={`game-player ${player}`}
              alt=""
            />

            {ballRender.visible && (
              <img
                src="/basketball.png"
                className="game-ball"
                alt=""
                style={{
                  left: ballRender.x,
                  top: ballRender.y,
                  transform: `translate(-50%, -50%) rotate(${ballRender.rotation}deg)`,
                }}
              />
            )}

            {message && (
              <div className="score-message">
                {message}
              </div>
            )}

            {score === 0 &&
              !ballRef.current.shooting && (
                <div className="swipe-hint">
                  <div className="swipe-arrow">↑</div>

                  SWIPE UP TO SHOOT
                </div>
              )}
          </>
        )}

        {/* ==================================
            GAME OVER
        ================================== */}

        {screen === "gameover" && (
          <div className="gameover-screen">
            <div className="gameover-panel">
              <div className="gameover-small">
                TIME!
              </div>

              <h2>GAME OVER</h2>

              <img
                src={selectImage}
                className="gameover-player"
                alt=""
              />

              <div className="final-score">
                <span>FINAL SCORE</span>
                <strong>{score}</strong>
              </div>

              <div className="final-stats">
                BEST COMBO{" "}
                <strong>{bestCombo}x</strong>
              </div>

              <button
                className="start-button play-again"
                onClick={startGame}
              >
                PLAY AGAIN
              </button>

              <button
                className="change-player"
                onClick={backToMenu}
              >
                CHANGE PLAYER
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}