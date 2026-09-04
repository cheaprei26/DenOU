"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type TimerMode = 10 | 20 | 30 | 40;

const MODE_OPTIONS: TimerMode[] = [10, 20, 30, 40];
const SEGMENT_COUNT = 60;

export default function Home() {
  const [selectedMinutes, setSelectedMinutes] =
    useState<TimerMode>(40);

  const [remaining, setRemaining] = useState(40 * 60);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");

  const endTimeRef = useRef<number | null>(null);
  const announcedRef = useRef<Set<number>>(new Set());
  const messageTimerRef = useRef<number | null>(null);

  const totalSeconds = selectedMinutes * 60;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      secs
    ).padStart(2, "0")}`;
  };

  const speak = (text: string) => {
    if (typeof window === "undefined") return;

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);

    speech.lang = "ja-JP";
    speech.rate = 0.9;
    speech.pitch = 1;
    speech.volume = 1;

    const voices = window.speechSynthesis.getVoices();

    const japaneseVoice = voices.find((voice) =>
      voice.lang.toLowerCase().startsWith("ja")
    );

    if (japaneseVoice) {
      speech.voice = japaneseVoice;
    }

    window.speechSynthesis.speak(speech);
  };

  const clearMessageLater = () => {
    if (messageTimerRef.current !== null) {
      window.clearTimeout(messageTimerRef.current);
    }

    messageTimerRef.current = window.setTimeout(() => {
      setMessage("");
      messageTimerRef.current = null;
    }, 4000);
  };

  const announceElapsed = (elapsedMinutes: number) => {
    if (announcedRef.current.has(elapsedMinutes)) return;

    announcedRef.current.add(elapsedMinutes);

    const text = `${elapsedMinutes}分経過`;

    setMessage(text);
    speak(text);

    clearMessageLater();
  };

  const announceEnd = () => {
    if (announcedRef.current.has(999)) return;

    announcedRef.current.add(999);

    if (messageTimerRef.current !== null) {
      window.clearTimeout(messageTimerRef.current);
    }

    setMessage("やめ");
    speak("やめ");
  };

  useEffect(() => {
    if (!running) return;

    const interval = window.setInterval(() => {
      if (endTimeRef.current === null) return;

      const difference = endTimeRef.current - Date.now();

      const nextRemaining = Math.max(
        0,
        Math.ceil(difference / 1000)
      );

      setRemaining((previous) => {
        const tenMinutePoint =
          totalSeconds - 10 * 60;

        const twentyMinutePoint =
          totalSeconds - 20 * 60;

        const thirtyMinutePoint =
          totalSeconds - 30 * 60;

        if (
          selectedMinutes >= 20 &&
          previous > tenMinutePoint &&
          nextRemaining <= tenMinutePoint
        ) {
          announceElapsed(10);
        }

        if (
          selectedMinutes >= 30 &&
          previous > twentyMinutePoint &&
          nextRemaining <= twentyMinutePoint
        ) {
          announceElapsed(20);
        }

        if (
          selectedMinutes >= 40 &&
          previous > thirtyMinutePoint &&
          nextRemaining <= thirtyMinutePoint
        ) {
          announceElapsed(30);
        }

        if (
          previous > 0 &&
          nextRemaining <= 0
        ) {
          announceEnd();
        }

        return nextRemaining;
      });

      if (nextRemaining <= 0) {
        setRunning(false);
        endTimeRef.current = null;
        window.clearInterval(interval);
      }
    }, 200);

    return () => {
      window.clearInterval(interval);
    };
  }, [running, selectedMinutes, totalSeconds]);

  useEffect(() => {
    return () => {
      if (messageTimerRef.current !== null) {
        window.clearTimeout(messageTimerRef.current);
      }
    };
  }, []);

  const selectMode = (minutes: TimerMode) => {
    if (running) return;

    setSelectedMinutes(minutes);
    setRemaining(minutes * 60);
    setMessage("");

    endTimeRef.current = null;
    announcedRef.current.clear();

    if (messageTimerRef.current !== null) {
      window.clearTimeout(messageTimerRef.current);
      messageTimerRef.current = null;
    }

    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }
  };

  const startTimer = () => {
    if (remaining <= 0) return;

    if (messageTimerRef.current !== null) {
      window.clearTimeout(messageTimerRef.current);
      messageTimerRef.current = null;
    }

    setMessage("");

    endTimeRef.current =
      Date.now() + remaining * 1000;

    setRunning(true);
  };

  const pauseTimer = () => {
    setRunning(false);
    endTimeRef.current = null;
  };

  const resetTimer = () => {
    setRunning(false);
    setRemaining(selectedMinutes * 60);
    setMessage("");

    endTimeRef.current = null;
    announcedRef.current.clear();

    if (messageTimerRef.current !== null) {
      window.clearTimeout(messageTimerRef.current);
      messageTimerRef.current = null;
    }

    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }
  };

  const fullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {}
  };

  const progress =
    totalSeconds > 0
      ? remaining / totalSeconds
      : 0;

  const elapsedSeconds =
    totalSeconds - remaining;

  const elapsedMinutes =
    Math.floor(elapsedSeconds / 60);

  const progressPercent =
    Math.max(
      0,
      Math.min(100, Math.round(progress * 100))
    );

  const activeSegments =
    Math.ceil(progress * SEGMENT_COUNT);

  const segments = useMemo(() => {
    return Array.from(
      { length: SEGMENT_COUNT },
      (_, index) => index
    );
  }, []);

  const milestoneItems = [
    ...(selectedMinutes >= 20
      ? [{ minute: 10, label: "10 MIN" }]
      : []),

    ...(selectedMinutes >= 30
      ? [{ minute: 20, label: "20 MIN" }]
      : []),

    ...(selectedMinutes >= 40
      ? [{ minute: 30, label: "30 MIN" }]
      : []),

    {
      minute: selectedMinutes,
      label: "END",
    },
  ];

  const isMilestoneReached = (
    minute: number,
    label: string
  ) => {
    if (label === "END") {
      return remaining === 0;
    }

    return elapsedMinutes >= minute;
  };

  const getMilestoneTime = (
    minute: number,
    label: string
  ) => {
    if (label === "END") {
      return remaining === 0 ? "00:00" : "--:--";
    }

    if (elapsedMinutes < minute) {
      return "--:--";
    }

    const reachedAt =
      totalSeconds - minute * 60;

    return formatTime(reachedAt);
  };

  return (
    <main
      className={`timerPage ${
        remaining === 0 ? "finished" : ""
      }`}
    >
      <div className="backgroundGrid" />
      <div className="backgroundLines" />
      <div className="backgroundGlow" />

      <header className="topBar">
        <div className="systemName">
          <strong>
            DENOU // COUNTDOWN SYSTEM
          </strong>

          <span>
            SESSION CONTROL INTERFACE
          </span>
        </div>

        <div className="systemStatus">
          <span>SYSTEM STATUS</span>

          <i />

          <strong>
            {running ? "ACTIVE" : "READY"}
          </strong>
        </div>
      </header>

      <section className="dashboard">
        <aside className="leftPanel">
          <section className="hudPanel">
            <div className="panelHeader">
              <span className="panelIcon">
                ≡
              </span>

              <strong>
                SESSION MODE
              </strong>
            </div>

            <div className="modeList">
              {MODE_OPTIONS.map(
                (minutes) => (
                  <button
                    key={minutes}
                    className={`modeButton ${
                      selectedMinutes ===
                      minutes
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      selectMode(minutes)
                    }
                    disabled={running}
                  >
                    <strong>
                      {minutes}
                    </strong>

                    <span>
                      MIN
                    </span>
                  </button>
                )
              )}
            </div>
          </section>

          <section className="hudPanel sessionInfoPanel">
            <div className="panelHeader">
              <span className="panelIcon">
                ▥
              </span>

              <strong>
                SESSION INFO
              </strong>
            </div>

            <div className="infoRows">
              <div>
                <span>
                  TOTAL TIME
                </span>

                <strong>
                  {selectedMinutes}:00
                </strong>
              </div>

              <div>
                <span>
                  ELAPSED TIME
                </span>

                <strong>
                  {formatTime(
                    elapsedSeconds
                  )}
                </strong>
              </div>

              <div>
                <span>
                  REMAINING TIME
                </span>

                <strong>
                  {formatTime(
                    remaining
                  )}
                </strong>
              </div>

              <div>
                <span>
                  PROGRESS
                </span>

                <strong className="accentText">
                  {progressPercent}%
                </strong>
              </div>
            </div>
          </section>
        </aside>

        <section className="centerPanel">
          <div className="timerCore">
            <div className="outerOrbit orbitOne" />
            <div className="outerOrbit orbitTwo" />

            <div className="marker markerTop">
              <strong>00</strong>
            </div>

            <div className="marker markerRight">
              <strong>10</strong>
            </div>

            <div className="marker markerBottom">
              <strong>20</strong>
            </div>

            <div className="marker markerLeft">
              <strong>30</strong>
            </div>

            <div className="segmentRing">
              {segments.map((segment) => {
                const isActive =
                  segment < activeSegments;

                const angle =
                  segment *
                  (360 / SEGMENT_COUNT);

                return (
                  <span
                    key={segment}
                    className={`segment ${
                      isActive
                        ? "active"
                        : ""
                    }`}
                    style={
                      {
                        "--angle":
                          `${angle}deg`,
                      } as React.CSSProperties
                    }
                  />
                );
              })}
            </div>

            <div className="innerRing">
              <div className="crosshair crosshairTop" />
              <div className="crosshair crosshairRight" />
              <div className="crosshair crosshairBottom" />
              <div className="crosshair crosshairLeft" />

              <div className="timerContent">
                <span className="remainingLabel">
                  REMAINING TIME
                </span>

                <div className="mainClock">
                  {formatTime(
                    remaining
                  )}
                </div>

                <span className="percentageLabel">
                  PERCENTAGE
                </span>

                <div className="percentageValue">
                  {progressPercent}
                  <small>%</small>
                </div>
              </div>
            </div>
          </div>

          <div className="mainControls">
            {!running ? (
              <button
                className="controlButton primaryControl"
                onClick={startTimer}
                disabled={
                  remaining === 0
                }
              >
                <span className="controlIcon">
                  ▶
                </span>

                <span className="controlText">
                  <strong>
                    START
                  </strong>

                  <small>
                    COUNTDOWN
                  </small>
                </span>
              </button>
            ) : (
              <button
                className="controlButton primaryControl"
                onClick={pauseTimer}
              >
                <span className="controlIcon">
                  Ⅱ
                </span>

                <span className="controlText">
                  <strong>
                    PAUSE
                  </strong>

                  <small>
                    COUNTDOWN
                  </small>
                </span>
              </button>
            )}

            <button
              className="controlButton"
              onClick={resetTimer}
            >
              <span className="controlIcon">
                ↻
              </span>

              <span className="controlText">
                <strong>
                  RESET
                </strong>

                <small>
                  SESSION
                </small>
              </span>
            </button>

            <button
              className="controlButton"
              onClick={fullscreen}
            >
              <span className="controlIcon">
                ⛶
              </span>

              <span className="controlText">
                <strong>
                  FULL SCREEN
                </strong>

                <small>
                  DISPLAY
                </small>
              </span>
            </button>
          </div>
        </section>

        <aside className="rightPanel">
          <section className="hudPanel announcementPanel">
            <div className="panelHeader">
              <span className="panelIcon">
                ◖
              </span>

              <strong>
                ANNOUNCEMENT
              </strong>
            </div>

            <div
              className={`announcementDisplay ${
                message
                  ? "active"
                  : ""
              }`}
            >
              <strong>
                {message ||
                  (running
                    ? "計測中"
                    : "待機中")}
              </strong>

              <div className="waveform">
                {Array.from(
                  { length: 34 },
                  (_, index) => (
                    <span
                      key={index}
                      style={{
                        height:
                          `${
                            7 +
                            ((index * 17) %
                              27)
                          }px`,
                      }}
                    />
                  )
                )}
              </div>
            </div>
          </section>

          <section className="hudPanel milestonePanel">
            <div className="panelHeader">
              <span className="panelIcon">
                ⚑
              </span>

              <strong>
                MILESTONE
              </strong>
            </div>

            <div className="milestoneList">
              {milestoneItems.map(
                (item) => {
                  const reached =
                    isMilestoneReached(
                      item.minute,
                      item.label
                    );

                  return (
                    <div
                      key={
                        item.label
                      }
                      className={`milestoneItem ${
                        reached
                          ? "reached"
                          : ""
                      }`}
                    >
                      <span className="milestoneDot" />

                      <span className="milestoneLabel">
                        {item.label}
                      </span>

                      <span className="milestoneTime">
                        {getMilestoneTime(
                          item.minute,
                          item.label
                        )}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          </section>
        </aside>
      </section>

      <footer className="bottomBar">
        <span>
          DENOU TIMER SYSTEM
        </span>

        <div className="footerLine" />

        <span>
          FOCUS // CONTROL // ACHIEVE
        </span>
      </footer>
    </main>
  );
}