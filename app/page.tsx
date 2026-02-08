"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Play, Camera, Music, Volume2, Loader2 } from "lucide-react";

interface Task {
  id: string;
  command: string;
  status: "pending" | "processing" | "completed" | "failed";
  result?: string;
  timestamp: Date;
}

interface Worker {
  id: string;
  name: string;
  status: "idle" | "busy";
  capability: string[];
}

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([
    { id: "w1", name: "Media Player", status: "idle", capability: ["play", "music", "song", "video", "youtube"] },
    { id: "w2", name: "Camera Controller", status: "idle", capability: ["camera", "photo", "picture", "selfie", "capture"] },
    { id: "w3", name: "System Assistant", status: "idle", capability: ["open", "close", "search", "help"] },
  ]);
  const [currentCommand, setCurrentCommand] = useState("");
  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-IN"; // English-India supports Hinglish

        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + " ";
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            setTranscript(finalTranscript.trim());
            processCommand(finalTranscript.trim());
          } else {
            setCurrentCommand(interimTranscript);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
        };
      }
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
      setCurrentCommand("");
    }
  };

  const processCommand = async (command: string) => {
    const taskId = Date.now().toString();
    const newTask: Task = {
      id: taskId,
      command,
      status: "pending",
      timestamp: new Date(),
    };

    setTasks((prev) => [newTask, ...prev]);

    // Orchestrator logic: parse and route to appropriate worker
    const lowerCommand = command.toLowerCase();

    // Music/Video commands
    if (lowerCommand.includes("play") || lowerCommand.includes("bajao") ||
        lowerCommand.includes("song") || lowerCommand.includes("gaana") ||
        lowerCommand.includes("music") || lowerCommand.includes("video") ||
        lowerCommand.includes("youtube")) {
      await handleMusicCommand(taskId, command);
    }
    // Camera commands
    else if (lowerCommand.includes("camera") || lowerCommand.includes("photo") ||
             lowerCommand.includes("picture") || lowerCommand.includes("selfie") ||
             lowerCommand.includes("tasveer") || lowerCommand.includes("khicho") ||
             lowerCommand.includes("click")) {
      await handleCameraCommand(taskId, command);
    }
    // Generic commands
    else {
      await handleGenericCommand(taskId, command);
    }
  };

  const handleMusicCommand = async (taskId: string, command: string) => {
    updateTaskStatus(taskId, "processing", "Searching for music...");
    updateWorkerStatus("w1", "busy");

    // Extract song name
    const lowerCommand = command.toLowerCase();
    let songQuery = command;

    // Remove common trigger words
    const triggers = ["play", "bajao", "song", "gaana", "music", "video", "youtube"];
    triggers.forEach(trigger => {
      songQuery = songQuery.replace(new RegExp(trigger, "gi"), "");
    });
    songQuery = songQuery.trim();

    if (songQuery) {
      const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(songQuery)}`;
      window.open(youtubeSearchUrl, "_blank");
      updateTaskStatus(taskId, "completed", `Opening YouTube search for: ${songQuery}`);
      speak(`Opening YouTube to search for ${songQuery}`);
    } else {
      updateTaskStatus(taskId, "failed", "Could not identify song name");
      speak("Please specify a song name");
    }

    updateWorkerStatus("w1", "idle");
  };

  const handleCameraCommand = async (taskId: string, command: string) => {
    updateTaskStatus(taskId, "processing", "Accessing camera...");
    updateWorkerStatus("w2", "busy");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);

        // Auto-capture after 3 seconds
        setTimeout(() => {
          capturePhoto(taskId);
        }, 3000);

        updateTaskStatus(taskId, "processing", "Camera ready - capturing in 3 seconds...");
        speak("Camera ready, capturing photo in 3 seconds");
      }
    } catch (error) {
      updateTaskStatus(taskId, "failed", "Camera access denied or not available");
      speak("Unable to access camera");
      updateWorkerStatus("w2", "idle");
    }
  };

  const capturePhoto = (taskId: string) => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `photo-${Date.now()}.jpg`;
            a.click();

            updateTaskStatus(taskId, "completed", "Photo captured and downloaded");
            speak("Photo captured successfully");
          }
        });
      }

      // Stop camera
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      setCameraActive(false);
      updateWorkerStatus("w2", "idle");
    }
  };

  const handleGenericCommand = async (taskId: string, command: string) => {
    updateTaskStatus(taskId, "processing", "Processing command...");
    updateWorkerStatus("w3", "busy");

    setTimeout(() => {
      updateTaskStatus(taskId, "completed", `Understood: ${command}`);
      speak("Command processed");
      updateWorkerStatus("w3", "idle");
    }, 1000);
  };

  const updateTaskStatus = (taskId: string, status: Task["status"], result?: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, status, result } : task
      )
    );
  };

  const updateWorkerStatus = (workerId: string, status: Worker["status"]) => {
    setWorkers((prev) =>
      prev.map((worker) =>
        worker.id === workerId ? { ...worker, status } : worker
      )
    );
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-IN';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Voice Agentic Orchestrator
          </h1>
          <p className="text-purple-200 text-lg">
            Command in Hindi • Urdu • English • Hinglish
          </p>
        </div>

        {/* Main Control */}
        <div className="flex justify-center mb-12">
          <button
            onClick={toggleListening}
            className={`relative p-8 rounded-full transition-all duration-300 ${
              isListening
                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                : "bg-purple-600 hover:bg-purple-700"
            } shadow-2xl`}
          >
            {isListening ? (
              <MicOff className="w-16 h-16 text-white" />
            ) : (
              <Mic className="w-16 h-16 text-white" />
            )}
            {isListening && (
              <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 translate-y-full mt-4 text-red-300 font-semibold">
                Listening...
              </span>
            )}
          </button>
        </div>

        {/* Current Command */}
        {currentCommand && (
          <div className="text-center mb-8">
            <div className="inline-block bg-purple-800/50 backdrop-blur-sm px-6 py-3 rounded-lg">
              <p className="text-purple-200 text-sm mb-1">Hearing:</p>
              <p className="text-white text-xl">{currentCommand}</p>
            </div>
          </div>
        )}

        {/* Camera Video */}
        {cameraActive && (
          <div className="flex justify-center mb-8">
            <div className="bg-black rounded-lg overflow-hidden shadow-2xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full max-w-2xl"
              />
            </div>
          </div>
        )}

        {/* Workers Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {workers.map((worker) => (
            <div
              key={worker.id}
              className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-purple-500/30"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">{worker.name}</h3>
                {worker.status === "busy" ? (
                  <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                ) : (
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                )}
              </div>
              <p className="text-sm text-purple-200">
                {worker.status === "idle" ? "Ready" : "Processing..."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {worker.capability.slice(0, 3).map((cap, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-purple-600/50 px-2 py-1 rounded text-purple-100"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Task Queue */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-purple-500/30">
          <h2 className="text-2xl font-bold text-white mb-6">Task Queue</h2>
          <div className="space-y-4">
            {tasks.length === 0 ? (
              <p className="text-purple-200 text-center py-8">
                No tasks yet. Try saying "Play a song" or "Take a photo"
              </p>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white/5 rounded-lg p-4 border border-purple-500/20"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-white font-medium flex-1">{task.command}</p>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        task.status === "completed"
                          ? "bg-green-500/20 text-green-300"
                          : task.status === "failed"
                          ? "bg-red-500/20 text-red-300"
                          : task.status === "processing"
                          ? "bg-yellow-500/20 text-yellow-300"
                          : "bg-blue-500/20 text-blue-300"
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                  {task.result && (
                    <p className="text-purple-200 text-sm mt-2">{task.result}</p>
                  )}
                  <p className="text-purple-300 text-xs mt-2">
                    {task.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-12 bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-purple-500/20">
          <h3 className="text-white font-semibold mb-4">Try these commands:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 text-purple-200">
              <Music className="w-5 h-5 text-purple-400" />
              <span>"Play Shape of You" or "Gaana bajao"</span>
            </div>
            <div className="flex items-center gap-3 text-purple-200">
              <Camera className="w-5 h-5 text-purple-400" />
              <span>"Take a photo" or "Tasveer khicho"</span>
            </div>
            <div className="flex items-center gap-3 text-purple-200">
              <Play className="w-5 h-5 text-purple-400" />
              <span>"Play Kesariya song"</span>
            </div>
            <div className="flex items-center gap-3 text-purple-200">
              <Volume2 className="w-5 h-5 text-purple-400" />
              <span>"Camera kholo" (Hinglish)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
