import React from "react";
import sanityClient from "../../client";
import imageUrlBuilder from "@sanity/image-url";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";

// Get a pre-configured url-builder from your sanity client
const builder = imageUrlBuilder(sanityClient);

function urlFor(source) {
  return builder.image(source);
}

export default function Image(props) {
  const image = props.image;
  const classs = props.class;
  const width = props.width;
  const maxHeight = props.height;
  const isFullHeight = props.isFullHeight;

  return (
    <LazyLoadImage
      loading="lazy"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      src={
        maxHeight
          ? urlFor(image.asset).height(maxHeight).url()
          : width
          ? urlFor(image.asset).width(width).url()
          : urlFor(image.asset).url()
      }
      placeholdersrc={urlFor(image.asset).height(2).url()}
      key={image.asset._ref}
      alt={image.alt}
      style={{
        objectPosition:
          image.hotspot &&
          `${image.hotspot.x * 100}% ${image.hotspot.y * 100}%`,
        maxHeight: maxHeight,
        height: isFullHeight ? maxHeight : "auto",
      }}
      className={classs}
      effect="blur"
    />
  );
}
