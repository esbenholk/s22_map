import { useRef, useEffect, useState, useContext } from "react";
import * as d3 from "d3";

import imageUrlBuilder from "@sanity/image-url";
import useWindowDimensions from "./useWindowDimensions";
import client from "./client";
import BlockContent from "./blockContent";
import VideoPlayer from "./videoPlayer";

const builder = imageUrlBuilder(client);
function urlFor(source) {
  return builder.image(source);
}

function Canvas({ _centers }) {
  const containerRef = useRef(null);
  const zoomRef = useRef(null);
  const zoomBehaviorRef = useRef(null);
  const [centers, setCenters] = useState(_centers);
  const [globalItems, setGlobalItems] = useState([]);
  const [globalConnections, setGlobalConnections] = useState([]);
  const [hasMeasured, setHasMeasured] = useState(false);
  const { width, height } = useWindowDimensions();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const svg = d3.select(zoomRef.current);
    const zoomBehavior = d3.zoom().on("zoom", (event) => {
      d3.select(containerRef.current).attr("transform", event.transform);
    });
    zoomBehaviorRef.current = zoomBehavior;
    svg.call(zoomBehavior);
  }, []);

  const getCenterXY = (center, index, width, height) => ({
    x: index === 0 ? width / 2 : center.x,
    y: index === 0 ? height / 2 : center.y,
  });

  const typePriority = {
    titleElement: 9,
    buttonElement: 8,
    descriptionElement: 7,
    imageElement: 4,
    videoElement: 5, // future use
  };

  useEffect(() => {
    setIsMobile(width > 700 ? false : true);
    // setGlobalItems([
    //   {
    //     id: "legend",
    //     type: "description",
    //     x: 200,
    //     y: 200,
    //     text: "This is a global floating node",
    //     color: "green",
    //     width: null,
    //     height: null,
    //   },
    //   {
    //     id: "realitylagcenter",
    //     type: "description",
    //     x: width / 2 + window.innerWidth + 500,
    //     y: height / 2 + window.innerWidth,
    //     text: "x",
    //     color: "green",
    //     width: null,
    //     height: null,
    //   },
    // ]);

    // setGlobalConnections([{ ids: ["legend", "realitylagcenter"] }]);
  }, [width, height]);

  useEffect(() => {
    const handleResize = () => setHasMeasured(false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (_centers.length === 0 || hasMeasured === true) return;

    setTimeout(() => {
      const updatedCenters = _centers.map((center) => {
        const updatedElements = center.elements.map((el) => {
          const flat = flattenElementTree(
            el,
            { x: center.x, y: center.y, id: center.id, color: center.color },
            width
          );

          return {
            ...el,
            childElements:
              el.childElements?.map((child) => {
                const node = document.getElementById(child.id);
                if (node) {
                  const bbox = node.getBoundingClientRect();
                  return {
                    ...child,
                    width: bbox.width,
                    height: bbox.height,
                  };
                }
                return child;
              }) ?? [],
            width: (() => {
              const node = document.getElementById(el.id);
              return node?.getBoundingClientRect().width ?? el.width;
            })(),
            height: (() => {
              const node = document.getElementById(el.id);
              return node?.getBoundingClientRect().height ?? el.height;
            })(),
          };
        });
        return {
          ...center,
          elements: updatedElements,
        };
      });

      setCenters(updatedCenters);
      setHasMeasured(true);
    }, 100);
  }, [centers, hasMeasured]);

  const flattenElementTree = (el, parent, windowWidth) => {
    const inheritedColor = el.color || parent.color || "black";

    let width = el.width ?? null;
    let height = el.height ?? null;

    if (el._type === "imageElement" && el.src?.metadata?.dimensions) {
      const { width: imgW, height: imgH } = el.src.metadata.dimensions;
      const aspectRatio = imgH / imgW;

      // 👇 Check if width is already defined
      if (width === null) {
        const targetWidth = isMobile ? windowWidth - 50 : 400;
        width = targetWidth;
      }

      // 👇 Always recalculate height from aspect ratio
      height = width * aspectRatio;
    }

    const base = {
      ...el,
      absX: parent.x + el.x,
      absY: parent.y + el.y,
      relX: el.x,
      relY: el.y,
      width,
      height,
      color: inheritedColor,
      centerId: parent.id,
    };

    const children = (el.childElements || []).flatMap((child) =>
      flattenElementTree(
        child,
        { x: base.absX, y: base.absY, color: inheritedColor, id: parent.id },
        windowWidth
      )
    );

    return [base, ...children];
  };

  const flattenedElements = [
    ...centers.flatMap((center, index) => {
      const centerX = index === 0 ? width / 2 : center.x;
      const centerY = index === 0 ? height / 2 : center.y;

      return center.elements.flatMap((el) =>
        flattenElementTree(
          el,
          { x: centerX, y: centerY, color: center.color, id: center.id },
          width
        )
      );
    }),
    ...globalItems.map((el) => ({
      ...el,
      absX: el.x,
      absY: el.y,
      relX: 0,
      relY: 0,
      centerId: null,
    })),
  ];

  const sortedElements = [...flattenedElements].sort((a, b) => {
    return (typePriority[a._type] || 999) - (typePriority[b._type] || 999);
  });

  const drawPipePath = (elements, ids) => {
    if (ids.length < 2) return "";
    const RADIUS = 50;
    const path = d3.path();

    // const points = ids
    //   .map((id) => {
    //     const el = elements.find((el) => el.id === id);
    //     return el ? [el.absX, el.absY] : null;
    //   })
    //   .filter(Boolean);

    const points = ids
      .map((id) => {
        const el = elements.find((el) => el.id === id);
        if (!el || el.absX == null || el.absY == null) return null;
        return [el.absX, el.absY];
      })
      .filter(Boolean);

    const [start, end] = points;
    if (!start || !end) return "";

    const [x1, y1] = start;
    const [x2, y2] = end;
    path.moveTo(x1, y1);

    const horizontalFirst = Math.abs(x2 - x1) > Math.abs(y2 - y1);
    const midX = horizontalFirst ? x2 : x1;
    const midY = horizontalFirst ? y1 : y2;

    const segments = [
      [x1, y1],
      [midX, midY],
      [x2, y2],
    ];

    for (let i = 1; i < segments.length - 1; i++) {
      const [xPrev, yPrev] = segments[i - 1];
      const [xCurr, yCurr] = segments[i];
      const [xNext, yNext] = segments[i + 1];

      const dx1 = xCurr - xPrev;
      const dy1 = yCurr - yPrev;
      const dx2 = xNext - xCurr;
      const dy2 = yNext - yCurr;

      const len1 = Math.hypot(dx1, dy1);
      const len2 = Math.hypot(dx2, dy2);
      const r = Math.min(RADIUS, len1 / 2, len2 / 2);

      const xEntry = xCurr - (dx1 / len1) * r;
      const yEntry = yCurr - (dy1 / len1) * r;
      const xExit = xCurr + (dx2 / len2) * r;
      const yExit = yCurr + (dy2 / len2) * r;

      path.lineTo(xEntry, yEntry);
      path.arcTo(xCurr, yCurr, xExit, yExit, r);
    }

    path.lineTo(x2, y2);
    return path.toString();
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          display: "flex",
          gap: "10px",
          padding: "10px",
          background: "rgba(255,255,255,0.9)",
          zIndex: 3,
        }}
      >
        {centers.map((center, idx) => (
          <button
            key={center.id}
            className="button"
            onClick={() => {
              const svg = d3.select(zoomRef.current);
              const transform = d3.zoomIdentity.translate(
                width / 2 - center.x,
                height / 2 - center.y
              );
              const { x: centerX, y: centerY } = getCenterXY(
                centers[0],
                0,
                width,
                height
              );

              svg
                .transition()
                .duration(750)
                .call(
                  zoomBehaviorRef.current.transform,
                  d3.zoomIdentity.translate(
                    width / 2 - centerX,
                    height / 2 - centerY
                  )
                );
              // svg
              //   .transition()
              //   .duration(750)
              //   .call(zoomBehaviorRef.current.transform, transform);
            }}
          >
            {center.id}
          </button>
        ))}
      </div>
      {/* <button
        onClick={resetZoom}
        style={{ position: "absolute", bottom: 10, right: 10 }}
        className="standard-button"
      >
        Reset View
      </button> */}
      <svg
        ref={zoomRef}
        style={{ width: "100vw", height: "100vh", touchAction: "none" }}
      >
        <g ref={containerRef}>
          {centers.flatMap((center, index) =>
            (center.connections || []).map((conn, i) => {
              const { x: centerX, y: centerY } = getCenterXY(
                center,
                index,
                width,
                height
              );

              return (
                <path
                  key={center.id + "_conn_" + i}
                  d={drawPipePath(
                    center.elements.flatMap((el) =>
                      flattenElementTree(
                        el,
                        {
                          x: centerX,
                          y: centerY,
                          color: center.color,
                          id: center.id,
                        },
                        width
                      )
                    ),
                    conn.ids
                  )}
                  fill="none"
                  stroke={center.color}
                  strokeWidth={1.5}
                />
              );
            })
          )}

          {globalConnections.map((conn, i) => (
            <path
              key={"global_conn_" + i}
              d={drawPipePath(
                [
                  ...centers.flatMap((center, index) => {
                    const { x: centerX, y: centerY } = getCenterXY(
                      center,
                      index,
                      width,
                      height
                    );

                    return center.elements.map((el) => ({
                      ...el,
                      absX: centerX + el.x,
                      absY: centerY + el.y,
                      relX: el.x,
                      relY: el.y,
                    }));
                  }),
                  ...globalItems.map((el) => ({
                    ...el,
                    absX: el.x,
                    absY: el.y,
                    relX: 0,
                    relY: 0,
                  })),
                ],
                conn.ids
              )}
              fill="none"
              stroke="red"
              strokeWidth={1.5}
            />
          ))}

          {sortedElements.map((el) => {
            const x = el.absX - (el.width || 0) / 2;
            const y = el.absY - (el.height || 0) / 2;

            if (el._type === "imageElement") {
              if (el.src != null)
                return (
                  <foreignObject
                    key={el.id}
                    id={el.id}
                    x={x}
                    y={y}
                    width={el.width || 300}
                    height={el.height || 300}
                  >
                    <div xmlns="http://www.w3.org/1999/xhtml">
                      <p style={{ color: el.color, textAlign: "left" }}>
                        {el.text}
                      </p>
                      <img
                        src={urlFor(el.src)
                          .width(el.width || 300)
                          .url()}
                        alt="img"
                      />
                    </div>
                  </foreignObject>
                );
            } else if (el._type === "buttonElement") {
              return (
                <foreignObject
                  key={el.id}
                  id={el.id}
                  x={x}
                  y={y}
                  width={el.width || 120}
                  height={el.height || 50}
                >
                  <div
                    xmlns="http://www.w3.org/1999/xhtml"
                    style={{
                      padding: "10px 15px",
                      background: "lightgrey",
                      borderRadius: "15px",
                      border: "1px solid" + el.color,
                      fontSize: "8px",
                    }}
                  >
                    <a
                      href={el.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="standard-button"
                    >
                      {el.label}
                    </a>
                  </div>
                </foreignObject>
              );
            } else if (el._type === "titleElement") {
              return (
                <foreignObject
                  key={el.id}
                  id={el.id}
                  x={x}
                  y={y}
                  width={el.width || 300}
                  height={el.height || 50}
                >
                  <div
                    xmlns="http://www.w3.org/1999/xhtml"
                    style={{
                      padding: "10px 15px",
                      background: "lightgrey",
                      borderRadius: "15px",
                      border: "1px solid" + el.color,
                      fontSize: "8px",
                    }}
                  >
                    <p
                      href={el.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="standard-button title"
                    >
                      {el.text}
                    </p>
                  </div>
                </foreignObject>
              );
            } else if (el._type === "descriptionElement") {
              return (
                <foreignObject
                  key={el.id}
                  id={el.id}
                  x={x}
                  y={y}
                  width={el.width || 300}
                  height={el.height || 200}
                >
                  <div
                    xmlns="http://www.w3.org/1999/xhtml"
                    style={{
                      padding: "10px",
                      background: "lightgrey",
                      borderRadius: "15px",
                      border: "1px solid" + el.color,
                      fontSize: "14px",
                    }}
                  >
                    <BlockContent blocks={el.content} />
                  </div>
                </foreignObject>
              );
            } else if (el._type === "videoElement") {
              console.log("has video", el);

              return (
                <foreignObject
                  key={el.id}
                  id={el.id}
                  x={x}
                  y={y}
                  width={el.width || 320}
                  height={el.height || 240}
                >
                  <div xmlns="http://www.w3.org/1999/xhtml">
                    <VideoPlayer url={el.src} />
                  </div>
                </foreignObject>
              );
            }
            return null;
          })}
          {globalConnections.map((conn, i) => (
            <path
              key={"global_conn_" + i}
              d={drawPipePath(
                [
                  ...centers.flatMap((center) =>
                    center.elements.map((el) => ({
                      ...el,
                      absX: center.x + el.x,
                      absY: center.y + el.y,
                      relX: el.x,
                      relY: el.y,
                    }))
                  ),
                  ...globalItems.map((el) => ({
                    ...el,
                    absX: el.x,
                    absY: el.y,
                    relX: 0,
                    relY: 0,
                  })),
                ],
                conn.ids
              )}
              fill="none"
              stroke="red"
              strokeWidth={1.5}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

export default function CanvasWrapper({ centers }) {
  console.log("has centers in wrapper", centers);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        left: 0,
        bottom: 0,
        zIndex: 2,
      }}
    >
      <Canvas _centers={centers} />
    </div>
  );
}
