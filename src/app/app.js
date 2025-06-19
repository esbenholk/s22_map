import client from "./client";
import { useEffect, useState } from "react";
import AsciiScene from "./asciimodel";

import Map from "./threeCanvas.js";

const focusCenterQuery = `*[_type == "focusCenter"]{
  _id,
  title,
  x,
  y,
  color,
  Color,
  "relativeTo": relativeTo->{_id, title, x, y},
  "color": color.hex,
  elements[]{
    ...,
       "color": color.hex,
    "src": select(type == "image" => src.asset->{
      _id,
      url,
      metadata { dimensions }
    }, null),
    "link": select(type == "video" => link, null),
    childElements[]{
      ...,
         "color": color.hex,
      "src": select(type == "image" => src.asset->{
        _id,
        urlm,
        metadata { dimensions }
      }, null),
      "link": select(type == "video" => link, null),
    }
  },
  connections
}`;

export default function App() {
  const [siteSettings, setSiteSettings] = useState();
  const [focusCenters, setFocusCenters] = useState();

  // get sitesettings and page names (for slug redirection)
  useEffect(() => {
    client
      .fetch(
        '*[_type == "siteSettings" ]{backgroundImage{asset->{url}}, favicon{asset->{url}}, mainImage, frames, doodles, playButtons, logo, maincolor, detailcolor, collagelayers,collagelayersMobile, popup, popupsarray[]{position,delay, image, title, url, project->{slug}, useProject, textcolor, maincolor, backgroundimage}, stickerarray, subtitle, textcolor, title, headerMenu[] {_type == "button" => { _type, linkTarget{url, project->{slug},category->{slug},page->{slug}, type}, title}}, footerMenu[] {_type == "button" => { _type, linkTarget{url, project->{slug},category->{slug},page->{slug}, type}, title}}, footerContent}'
      )
      .then((data) => {
        setSiteSettings(data[0]);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    client
      .fetch(focusCenterQuery)
      .then((data) => {
        console.log(data);

        const resolvedCenters = data.map((center) => {
          const absoluteX = center.relativeTo
            ? center.relativeTo.x + center.x
            : center.x;
          const absoluteY = center.relativeTo
            ? center.relativeTo.y + center.y
            : center.y;

          const flattenElement = (el, parentX = 0, parentY = 0) => {
            const base = {
              ...el,
              absX: parentX + el.x,
              absY: parentY + el.y,
            };

            const children = (el.childElements || []).map((child) =>
              flattenElement(child, base.absX, base.absY)
            );

            return [base, ...children];
          };

          const allElements = center.elements.flatMap((el) =>
            flattenElement(el, absoluteX, absoluteY)
          );

          return {
            id: center.title,
            color: center.color,
            x: absoluteX,
            y: absoluteY,
            elements: allElements,
            connections: center.connections || [],
          };
        });
        setFocusCenters(resolvedCenters);
      })
      .catch(console.error);
  }, []);

  return (
    <>
      {focusCenters && (
        <>
          <AsciiScene modelUrl={"/s2c_logo.glb"} />
          <Map centers={focusCenters} />
        </>
      )}{" "}
    </>
  );
}
