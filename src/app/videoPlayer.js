import React, { useState, useRef, useMemo } from "react";

import ReactPlayer from "react-player";

const VideoPlayer = ({ url }) => {
  const [playing, setPlaying] = useState(false);
  const playerRef = useRef(null);

  const isYouTube = ReactPlayer.canPlay(url) && url.includes("youtube");

  const aspectRatio = isYouTube ? 4 / 3 : 16 / 9;

  const width =
    window.innerWidth > 700
      ? window.innerWidth - 30
      : window.innerWidth - 200 - 60;

  const height =
    width / aspectRatio < window.innerHeight - 200
      ? width / aspectRatio
      : window.innerHeight - 200;

  const handlePlay = () => setPlaying(true);
  const handlePause = () => setPlaying(false);

  return (
    <div
      style={{
        position: "relative",
        width: width,
        height: height,
        // paddingTop,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: width,
          height: height,
        }}
      >
        <ReactPlayer
          ref={playerRef}
          url={url}
          playing={playing}
          controls={true}
          width={width}
          height={height}
          onPlay={handlePlay}
          onPause={handlePause}
        />
      </div>
    </div>
  );
};

export default VideoPlayer;
