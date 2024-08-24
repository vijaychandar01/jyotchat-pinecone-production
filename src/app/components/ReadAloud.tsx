import { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faVolumeHigh, faStopCircle, faSpinner } from "@fortawesome/free-solid-svg-icons";

// Global reference to keep track of the currently playing audio
let currentlyPlayingAudio: HTMLAudioElement | null = null;

export default function ReadAloudButton({ content }: { content: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const audioElement = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioElement.current) {
      const handlePause = () => {
        console.log("Audio paused, resetting isPlaying state");
        setIsPlaying(false);
      };

      const handleEnded = () => {
        console.log("Audio ended, resetting isPlaying state");
        setIsPlaying(false);
      };

      audioElement.current.addEventListener("pause", handlePause);
      audioElement.current.addEventListener("ended", handleEnded);

      return () => {
        if (audioElement.current) {
          audioElement.current.removeEventListener("pause", handlePause);
          audioElement.current.removeEventListener("ended", handleEnded);
        }
      };
    }
  }, [audioElement.current]);

  const handleAudioControl = async () => {
    try {
      if (isPlaying) {
        if (audioElement.current) {
          console.log("Stopping playback...");
          audioElement.current.pause();
          audioElement.current.currentTime = 0;
          setIsPlaying(false);
          currentlyPlayingAudio = null;
        }
      } else {
        // Stop any currently playing audio
        if (currentlyPlayingAudio && currentlyPlayingAudio !== audioElement.current) {
          console.log("Stopping the currently playing audio...");
          currentlyPlayingAudio.pause();
          currentlyPlayingAudio.currentTime = 0;
        }

        setIsLoadingAudio(true);
        console.log("Fetching audio...");

        // Split the content before the "References:" section
        const contentBeforeReferences = content.split('References:')[0].trim();

        const response = await fetch('/api/read-aloud', {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: contentBeforeReferences }),
        });

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const blob = new Blob([arrayBuffer], { type: "audio/wav" });
          const url = URL.createObjectURL(blob);

          console.log("Generated audio URL:", url);

          if (audioElement.current) {
            audioElement.current.pause();
            URL.revokeObjectURL(audioElement.current.src);
          }

          audioElement.current = new Audio(url);

          audioElement.current.play().then(() => {
            setIsPlaying(true);
            currentlyPlayingAudio = audioElement.current; // Update the global reference
          });

          audioElement.current.addEventListener("canplaythrough", () => {
            console.log("Audio can play through");
            setIsLoadingAudio(false);
          });

          audioElement.current.addEventListener("error", () => {
            console.error("Error during audio playback");
            setIsPlaying(false);
            setIsLoadingAudio(false);
            currentlyPlayingAudio = null;
          });
        } else {
          console.error("Error fetching audio:", response.statusText);
        }
      }
    } catch (error) {
      console.error("Error controlling audio:", error);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  return (
    <button onClick={handleAudioControl} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
      {isLoadingAudio ? (
        <FontAwesomeIcon icon={faSpinner} spin size="sm" style={{ cursor: "pointer" }} className="mr-3" />
      ) : (
        <FontAwesomeIcon
          icon={isPlaying ? faStopCircle : faVolumeHigh}
          size="sm"
          style={{ cursor: "pointer" }}
          className="mr-3"
        />
      )}
    </button>
  );
}
