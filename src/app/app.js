import { useEffect, useState } from "react";
import AsciiScene from "./asciimodel";
import BlockContent from "./blockContent";
import Map from "./threeCanvas.js";

import client from "./client";
import imageUrlBuilder from "@sanity/image-url";
const builder = imageUrlBuilder(client);

function urlFor(source) {
  return builder.image(source);
}

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

    childElements[]{
      ...,
         "color": color.hex,
      "src": select(type == "image" => src.asset->{
        _id,
        urlm,
        metadata { dimensions }
      }, null),
 
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
      .fetch('*[_type == "settings" ]{content, logo}')
      .then((data) => {
        console.log("settings", data);

        setSiteSettings(data[0]);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    client
      .fetch(focusCenterQuery)
      .then((data) => {
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

          <a
            className="button navbutton s2cbutton"
            href="https://subjecttochange.site/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {siteSettings && siteSettings.logo ? (
              <img src={urlFor(siteSettings.logo).width(30).url()} alt="img" />
            ) : (
              "S2C"
            )}
          </a>

          {siteSettings && siteSettings.content && (
            <div className="appcontent">
              {" "}
              <BlockContent blocks={siteSettings.content} />{" "}
            </div>
          )}
        </>
      )}{" "}
    </>
  );
}
