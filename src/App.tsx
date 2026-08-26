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
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  scored: boolean;
  startedAt: number;
  scoredAt: number | null;
};

type BallRender = {
  id: number;
  x: number;
  y: number;
  rotation: number;
};

const GAME_TIME = 30;

/*
  Faster gravity = quicker shot without
  making the ball fly miles above the screen.
*/
const SHOT_GRAVITY = 2500;

/*
  New basketball appears in hand this quickly
  after releasing the previous one.
*/
const RELOAD_TIME = 180;

export default function App() {
  const gameRef = useRef<HTMLDivElement | null>(null);
  const hoopRef = useRef<HTMLImageElement | null>(null);

  const animationRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);

  const nextBallIdRef = useRef(1);

  const [screen, setScreen] =
    useState<Screen>("menu");

  const [player, setPlayer] =
    useState<Player>("ninjacat");

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);

  /*
    Separate basket count so combo bonus
    doesn't suddenly shoot the LEVEL upwards.
  */
  const [madeShots, setMadeShots] = useState(0);

  const [timeLeft, setTimeLeft] =
    useState(GAME_TIME);

  const [hoopLeft, setHoopLeft] = useState(50);

  const [message, setMessage] = useState("");
  const [swish, setSwish] = useState(false);

  /*
    Ball currently waiting in player's hand.
  */
  const [ballReady, setBallReady] = useState(false);

  /*
    All basketballs currently flying.
  */
  const [flyingBalls, setFlyingBalls] =
    useState<BallRender[]>([]);

  const ballsRef = useRef<BallState[]>([]);

  const ballReadyRef = useRef(false);

  const pointerStart = useRef({
    x: 0,
    y: 0,
    active: false,
  });

  const screenRef = useRef<Screen>("menu");
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const madeShotsRef = useRef(0);

  /*
    If another basketball is still flying when
    one scores, don't suddenly move the hoop away
    from that second ball.

    We'll move it once the current flying shots
    have resolved.
  */
  const pendingHoopMoveRef = useRef(false);

  const messageTimeoutRef =
    useRef<number | null>(null);

  const swishTimeoutRef =
    useRef<number | null>(null);

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    comboRef.current = combo;
  }, [combo]);

  useEffect(() => {
    madeShotsRef.current = madeShots;
  }, [madeShots]);

  /* ========================================
     BALL SIZE
  ======================================== */

  const getBallSize = useCallback(() => {
    /*
      Your current mobile CSS makes it 95px,
      so scoring collision now matches that.
    */

    if (window.innerWidth <= 700) {
      return 95;
    }

    const width =
      gameRef.current?.clientWidth ??
      window.innerWidth;

    return Math.max(
      68,
      Math.min(90, width * 0.1)
    );
  }, []);

  /* ========================================
     BALL STARTING POSITION
  ======================================== */

  const getBallStart = useCallback(() => {
    const game = gameRef.current;

    if (!game) {
      return {
        x: 0,
        y: 0,
      };
    }

    const w = game.clientWidth;
    const h = game.clientHeight;

    /*
      Uses actual browser width so desktop
      does NOT accidentally use mobile position.
    */

    const isMobile =
      window.innerWidth <= 700;

    if (isMobile) {
      return {
        /*
          MOBILE ONLY.
          Your current hand position.
        */
        x: w * 0.76,
        y: h * 0.59,
      };
    }

    /*
      DESKTOP LEFT EXACTLY AS IT WAS.
    */

    return {
      x: w * 0.655,
      y: h * 0.615,
    };
  }, [player]);

  /* ========================================
     BALL RELOAD
  ======================================== */

  const makeBallReady = useCallback(() => {
    if (
      screenRef.current !== "playing"
    ) {
      return;
    }

    ballReadyRef.current = true;
    setBallReady(true);
  }, []);

  const reloadBall = useCallback(() => {
    window.setTimeout(() => {
      makeBallReady();
    }, RELOAD_TIME);
  }, [makeBallReady]);

  /* ========================================
     MESSAGE
  ======================================== */

  const showMessage = useCallback(
    (text: string) => {
      if (messageTimeoutRef.current) {
        window.clearTimeout(
          messageTimeoutRef.current
        );
      }

      setMessage(text);

      messageTimeoutRef.current =
        window.setTimeout(() => {
          setMessage("");
        }, 650);
    },
    []
  );

  /* ========================================
     SWISH EFFECT
  ======================================== */

  const triggerSwish =
    useCallback(() => {
      if (swishTimeoutRef.current) {
        window.clearTimeout(
          swishTimeoutRef.current
        );
      }

      setSwish(true);

      swishTimeoutRef.current =
        window.setTimeout(() => {
          setSwish(false);
        }, 450);
    }, []);

  /* ========================================
     MOVE HOOP
  ======================================== */

  const moveHoop = useCallback(() => {
    const positions = [
      35,
      42,
      50,
      58,
      65,
    ];

    setHoopLeft((current) => {
      const choices =
        positions.filter(
          (position) =>
            Math.abs(
              position - current
            ) >= 7
        );

      return choices[
        Math.floor(
          Math.random() *
            choices.length
        )
      ];
    });
  }, []);

  /* ========================================
     SCORE A BASKET
  ======================================== */

  const registerScore =
    useCallback(() => {
      /*
        Normal basket = +1 point.
      */

      const nextScore =
        scoreRef.current + 1;

      const nextCombo =
        comboRef.current + 1;

      const nextMadeShots =
        madeShotsRef.current + 1;

      scoreRef.current =
        nextScore;

      comboRef.current =
        nextCombo;

      madeShotsRef.current =
        nextMadeShots;

      setScore(nextScore);
      setCombo(nextCombo);
      setMadeShots(nextMadeShots);

      setBestCombo((old) =>
        Math.max(
          old,
          nextCombo
        )
      );

      triggerSwish();

      if (nextCombo >= 5) {
        showMessage(
          `🔥 ${nextCombo}x COMBO!`
        );
      } else if (
        nextCombo >= 3
      ) {
        showMessage(
          `${nextCombo}x COMBO!`
        );
      } else {
        showMessage(
          "SWISH! +1"
        );
      }

      /*
        Don't move basket immediately if other
        balls are still flying toward it.
      */

      pendingHoopMoveRef.current =
        true;
    }, [
      showMessage,
      triggerSwish,
    ]);

  /* ========================================
     BANK COMBO
  ======================================== */

  const bankCombo =
    useCallback(
      (showBonus = true) => {
        const streak =
          comboRef.current;

        if (streak <= 0) {
          comboRef.current = 0;
          setCombo(0);
          return 0;
        }

        /*
          YOUR SCORING RULE:

          4x combo = +40
          3x combo = +30
          etc.
        */

        const bonus =
          streak * 10;

        const newScore =
          scoreRef.current +
          bonus;

        scoreRef.current =
          newScore;

        comboRef.current = 0;

        setScore(newScore);
        setCombo(0);

        if (showBonus) {
          showMessage(
            `COMBO BONUS +${bonus}`
          );
        }

        return bonus;
      },
      [showMessage]
    );

  /* ========================================
     MISS
  ======================================== */

  const registerMiss =
    useCallback(() => {
      /*
        A miss ends the streak and banks
        whatever combo was built.
      */

      bankCombo(true);
    }, [bankCombo]);

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
      if (
        screenRef.current !==
        "playing"
      ) {
        return;
      }

      /*
        We only care whether there is currently
        a fresh basketball in the player's hand.

        Previous balls can still be flying.
      */

      if (
        !ballReadyRef.current
      ) {
        return;
      }

      const game =
        gameRef.current;

      const hoop =
        hoopRef.current;

      if (!game || !hoop) {
        return;
      }

      const gameRect =
        game.getBoundingClientRect();

      const hoopRect =
        hoop.getBoundingClientRect();

      const start =
        getBallStart();

      const swipeX =
        pointerEndX -
        pointerStartX;

      const swipeY =
        pointerEndY -
        pointerStartY;

      const upwardSwipe =
        Math.max(
          0,
          -swipeY
        );

      /*
        Player still controls power.
      */

      const power =
        Math.min(
          1.25,
          upwardSwipe / 220
        );

      /*
        Current hoop centre.
      */

      const rimX =
        hoopRect.left -
        gameRect.left +
        hoopRect.width *
          0.5;

      /*
        Horizontal direction still comes
        from YOUR swipe.
      */

      const swipeHorizontalVelocity =
        swipeX * 3.1;

      /*
        Small aim assist.

        This helps slightly but does NOT
        lock every shot onto the basket.
      */

      const distanceToHoop =
        rimX - start.x;

      const smallAimAssist =
        distanceToHoop *
        0.22;

      /*
        HORIZONTAL SPEED

        Quick enough to feel snappy.
      */

      const vx =
        (swipeHorizontalVelocity +
          smallAimAssist) *
        1.18;

      /*
        VERTICAL SPEED

        IMPORTANT:
        We are NOT using the previous 1.45
        multiplier anymore.

        That multiplier was why the ball
        disappeared miles above the screen.

        Strong gravity below makes this
        trajectory quick without a giant arc.
      */

      const vy =
        -(
          1180 +
          power * 200
        );

      const id =
        nextBallIdRef.current++;

      const newBall: BallState = {
        id,
        x: start.x,
        y: start.y,
        vx,
        vy,
        scored: false,
        startedAt:
          performance.now(),
        scoredAt: null,
      };

      /*
        Release this basketball.
      */

      ballsRef.current = [
        ...ballsRef.current,
        newBall,
      ];

      /*
        Remove waiting ball from hand.
      */

      ballReadyRef.current =
        false;

      setBallReady(false);

      /*
        NEW BALL APPEARS AFTER 180ms
        EVEN IF THIS BALL IS STILL FLYING.
      */

      reloadBall();
    },
    [
      getBallStart,
      reloadBall,
    ]
  );

  /* ========================================
     PHYSICS LOOP
  ======================================== */

  useEffect(() => {
    const frame = (time: number) => {
      const game = gameRef.current;
      const hoop = hoopRef.current;

      if (
        screenRef.current === "playing" &&
        game &&
        hoop &&
        ballsRef.current.length > 0
      ) {
        if (!lastFrameRef.current) {
          lastFrameRef.current = time;
        }

        let dt =
          (time - lastFrameRef.current) / 1000;

        dt = Math.min(dt, 0.025);

        const gameRect =
          game.getBoundingClientRect();

        const hoopRect =
          hoop.getBoundingClientRect();

        const rimY =
          hoopRect.top -
          gameRect.top +
          hoopRect.height * 0.29;

        const rimX =
          hoopRect.left -
          gameRect.left +
          hoopRect.width * 0.5;

        const rimHalfWidth =
          hoopRect.width * 0.2;

        const ballSize =
          getBallSize();

        const now =
          performance.now();

        const remainingBalls: BallState[] = [];

        for (const ball of ballsRef.current) {
          const previousY = ball.y;

          /*
            Faster gravity keeps shot quick
            and stops it flying miles off screen.
          */

          ball.vy += SHOT_GRAVITY * dt;

          ball.x += ball.vx * dt;
          ball.y += ball.vy * dt;

          const shotAge =
            now - ball.startedAt;

          /*
            SCORE ONLY WHEN BALL CROSSES
            DOWN THROUGH THE RIM.
          */

          if (!ball.scored) {
            const crossedRim =
              previousY < rimY &&
              ball.y >= rimY &&
              ball.vy > 0;

            const insideBasket =
              Math.abs(ball.x - rimX) <
              rimHalfWidth -
                ballSize * 0.05;

            if (
              crossedRim &&
              insideBasket
            ) {
              ball.scored = true;
              ball.scoredAt = now;

              registerScore();
            }
          }

          /*
            Keep scored ball visible briefly
            while it drops through the net.
          */

          if (
            ball.scored &&
            ball.scoredAt !== null &&
            now - ball.scoredAt > 420
          ) {
            continue;
          }

          /*
            MISS
          */

          if (!ball.scored) {
            const hasMissed =
              ball.y >
                game.clientHeight + 120 ||
              ball.x < -150 ||
              ball.x >
                game.clientWidth + 150 ||
              shotAge > 2400;

            if (hasMissed) {
              registerMiss();
              continue;
            }
          }

          remainingBalls.push(ball);
        }

        ballsRef.current =
          remainingBalls;

        /*
          UPDATE VISIBLE BALLS
        */

        setFlyingBalls(
          remainingBalls.map((ball) => ({
            id: ball.id,
            x: ball.x,
            y: ball.y,
            rotation:
              (now - ball.startedAt) * 0.3,
          }))
        );

        /*
          MOVE HOOP AFTER A SCORE

          Important:
          this now moves even if other balls
          are still flying.
        */

        if (pendingHoopMoveRef.current) {
          pendingHoopMoveRef.current = false;

          window.setTimeout(() => {
            if (
              screenRef.current === "playing"
            ) {
              moveHoop();
            }
          }, 180);
        }
      }

      lastFrameRef.current = time;

      animationRef.current =
        requestAnimationFrame(frame);
    };

    animationRef.current =
      requestAnimationFrame(frame);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(
          animationRef.current
        );
      }
    };
  }, [
    getBallSize,
    moveHoop,
    registerMiss,
    registerScore,
  ]);

  /* ========================================
     TIMER
  ======================================== */

  useEffect(() => {
    if (
      screen !== "playing"
    ) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          setTimeLeft(
            (current) => {
              if (
                current <= 1
              ) {
                window.clearInterval(
                  timer
                );

                /*
                  If game ends during a combo,
                  bank that streak ×10 as well.
                */

                bankCombo(false);

                ballsRef.current =
                  [];

                setFlyingBalls(
                  []
                );

                ballReadyRef.current =
                  false;

                setBallReady(
                  false
                );

                pendingHoopMoveRef.current =
                  false;

                screenRef.current =
                  "gameover";

                setScreen(
                  "gameover"
                );

                return 0;
              }

              return (
                current - 1
              );
            }
          );
        },
        1000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, [screen, bankCombo]);

  /* ========================================
     RESIZE
  ======================================== */

  useEffect(() => {
    const handleResize =
      () => {
        /*
          No desktop/mobile positioning
          values are changed here.

          This simply causes React to
          redraw the waiting ball.
        */

        if (
          screenRef.current ===
          "playing" &&
          ballReadyRef.current
        ) {
          setBallReady(false);

          requestAnimationFrame(
            () => {
              setBallReady(
                true
              );
            }
          );
        }
      };

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, []);

  /* ========================================
     START GAME
  ======================================== */

  const startGame = () => {
    scoreRef.current = 0;
    comboRef.current = 0;
    madeShotsRef.current = 0;

    ballsRef.current = [];

    pendingHoopMoveRef.current =
      false;

    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setMadeShots(0);

    setTimeLeft(
      GAME_TIME
    );

    setHoopLeft(50);

    setMessage("");
    setSwish(false);

    setFlyingBalls([]);

    ballReadyRef.current =
      false;

    setBallReady(false);

    screenRef.current =
      "playing";

    setScreen("playing");

    /*
      First ball appears immediately.
    */

    window.setTimeout(() => {
      makeBallReady();
    }, 60);
  };

  const backToMenu = () => {
    ballsRef.current = [];

    setFlyingBalls([]);

    ballReadyRef.current =
      false;

    setBallReady(false);

    pendingHoopMoveRef.current =
      false;

    screenRef.current =
      "menu";

    setScreen("menu");
  };

  /* ========================================
     POINTER / SWIPE
  ======================================== */

  const handlePointerDown = (
    e: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (
      screen !== "playing"
    ) {
      return;
    }

    if (
      !ballReadyRef.current
    ) {
      return;
    }

    if (
      pointerStart.current
        .active
    ) {
      return;
    }

    pointerStart.current = {
      x: e.clientX,
      y: e.clientY,
      active: true,
    };

    try {
      e.currentTarget.setPointerCapture(
        e.pointerId
      );
    } catch {
      // nothing
    }
  };

  const handlePointerUp = (
    e: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (
      screen !== "playing" ||
      !pointerStart.current
        .active
    ) {
      return;
    }

    const start =
      pointerStart.current;

    pointerStart.current.active =
      false;

    const dx =
      e.clientX -
      start.x;

    const dy =
      e.clientY -
      start.y;

    const distance =
      Math.hypot(
        dx,
        dy
      );

    if (
      distance >= 25 &&
      dy < -15
    ) {
      shootBall(
        start.x,
        start.y,
        e.clientX,
        e.clientY
      );
    }
  };

  const handlePointerCancel =
    () => {
      pointerStart.current.active =
        false;
    };

  const playerImage =
    player === "ninjacat"
      ? "/ninjacatplayer.png"
      : "/manyuplayer.png";

  const selectImage =
    player === "ninjacat"
      ? "/ninjacatselect.png"
      : "/manyuselect.png";

  /*
    LEVEL stays based on baskets,
    NOT combo bonus points.
  */

  const level =
    Math.floor(
      madeShots / 5
    ) + 1;

  const handBall =
    getBallStart();

  return (
    <div className="app">
      <div
        ref={gameRef}
        className="game"
        onPointerDown={
          handlePointerDown
        }
        onPointerUp={
          handlePointerUp
        }
        onPointerCancel={
          handlePointerCancel
        }
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
                <span>
                  BASKETBALL
                </span>
              </h1>

              <p>
                CHOOSE YOUR FIGHTER
              </p>
            </div>

            <div className="player-select">
              <button
                className={`player-card ninja-card ${
                  player ===
                  "ninjacat"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setPlayer(
                    "ninjacat"
                  )
                }
              >
                <img
                  src="/ninjacatselect.png"
                  alt="NinjaCat"
                />
              </button>

              <button
                className={`player-card manyu-card ${
                  player ===
                  "manyu"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setPlayer(
                    "manyu"
                  )
                }
              >
                <img
                  src="/manyuselect.png"
                  alt="Manyu"
                />
              </button>
            </div>

            <button
              className="start-button"
              onClick={
                startGame
              }
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

        {screen ===
          "playing" && (
          <>
            <div className="hud">
              <div className="hud-box">
                <span>
                  SCORE
                </span>

                <strong>
                  {score}
                </strong>
              </div>

              <div className="hud-box timer-box">
                <span>
                  TIME
                </span>

                <strong
                  className={
                    timeLeft <=
                    5
                      ? "danger-time"
                      : ""
                  }
                >
                  {timeLeft}
                </strong>
              </div>

              <div className="hud-box">
                <span>
                  COMBO
                </span>

                <strong>
                  {combo > 0
                    ? `${combo}x`
                    : "-"}
                </strong>
              </div>
            </div>

            <div className="level-display">
              LEVEL {level}
            </div>

            <div
              className={`hoop-wrap ${
                swish
                  ? "hoop-swish"
                  : ""
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

            {/* BALL WAITING IN HAND */}

            {ballReady && (
              <img
                src="/basketball.png"
                className="game-ball"
                alt=""
                style={{
                  left:
                    handBall.x,
                  top:
                    handBall.y,
                  transform:
                    "translate(-50%, -50%)",
                }}
              />
            )}

            {/* ALL BALLS CURRENTLY FLYING */}

            {flyingBalls.map(
              (ball) => (
                <img
                  key={ball.id}
                  src="/basketball.png"
                  className="game-ball"
                  alt=""
                  style={{
                    left:
                      ball.x,
                    top:
                      ball.y,
                    transform: `translate(-50%, -50%) rotate(${ball.rotation}deg)`,
                  }}
                />
              )
            )}

            {message && (
              <div className="score-message">
                {message}
              </div>
            )}

            {score === 0 &&
              ballReady && (
                <div className="swipe-hint">
                  <div className="swipe-arrow">
                    ↑
                  </div>

                  SWIPE UP TO
                  SHOOT
                </div>
              )}
          </>
        )}

        {/* ==================================
            GAME OVER
        ================================== */}

        {screen ===
          "gameover" && (
          <div className="gameover-screen">
            <div className="gameover-panel">
              <div className="gameover-small">
                TIME!
              </div>

              <h2>
                GAME OVER
              </h2>

              <img
                src={
                  selectImage
                }
                className="gameover-player"
                alt=""
              />

              <div className="final-score">
                <span>
                  FINAL SCORE
                </span>

                <strong>
                  {score}
                </strong>
              </div>

              <div className="final-stats">
                BEST COMBO{" "}
                <strong>
                  {bestCombo}x
                </strong>
              </div>

              <button
                className="start-button play-again"
                onClick={
                  startGame
                }
              >
                PLAY AGAIN
              </button>

              <button
                className="change-player"
                onClick={
                  backToMenu
                }
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
