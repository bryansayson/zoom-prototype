/**
 * This example borrows heavily from the algorithms prescribed by MDN in this article:
 * https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Pinch_zoom_gestures
 * and this github gist
 * https://gist.github.com/iammerrick/c4bbac856222d65d3a11dad1c42bdcca
 */
/**
 * TODOs
 * ~~~ 1. Stop using async events, and rely on synthetic events instead
 * 2. Handle aspect ratio zooming in and out
 * 3. Request animation frame any time you zoom in and out
 * 4. Maybe introduce CSS animation for zoom behavior to make things feel smoother
 * 5. Start zooming the original image, replacing it with the higher res image once zoom has finished
 *
 *
 * Types of movement that someone can do:
 * - Tap
 * - Pinch - in/out
 * - Pan (can also occur while pinching) -
 *
 *
 * State:
 * - x/y offset of image zoomed
 * - zoom factor
 *
 * Assumptions:
 * - Image is always going to be square
 * - Hovered image is always going to be the same aspect ratio as the original
 */

/**
 * 1 - 3
 * 1 - 600px
 * 2 - 1100 (1600-600) / 2 = 500px growth from 600
 * 3 - 1600px (1600-600) / 2 = 500px growth from 1100
 *
 */

import React, { Component } from "react";
import "./PinchToZoom.css";
// We always will assume that our images are square (since our image cruncher will have some problems with aspect ratio if we don't)
const images = {
  600: "https://secure.img1-fg.wfcdn.com/im/95036494/resize-h600-w600%5Ecompr-r85/1040/104018557/Vart+Geunuine+Leather+Swivel+34%2522+Lounge+Chair+and+Ottoman.jpg",
  800: "https://secure.img1-fg.wfcdn.com/im/90094606/resize-h800-w800%5Ecompr-r85/1040/104018557/Vart+Geunuine+Leather+Swivel+34%2522+Lounge+Chair+and+Ottoman.jpg",
  1600: "https://secure.img1-fg.wfcdn.com/im/90094606/resize-h1600-w1600%5Ecompr-r85/1040/104018557/Vart+Geunuine+Leather+Swivel+34%2522+Lounge+Chair+and+Ottoman.jpg"
};

const getPointFromTouch = (touch, element) => {
  const rect = element.getBoundingClientRect(); // TODO - don't always do this - maybe handle it on resize?
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
};

const getDistanceBetweenPointers = (pointerA, pointerB) =>
  Math.sqrt(
    Math.pow(pointerA.y - pointerB.y, 2) + Math.pow(pointerA.x - pointerB.x, 2)
  );

const getMidpoint = (pointerA, pointerB) => ({
  x: (pointerA.x + pointerB.x) / 2,
  y: (pointerA.y + pointerB.y) / 2
});

class PinchToZoom extends Component {
  state = {
    isZooming: false,
    touchAction: "none",
    position: {
      top: 0,
      left: 0
    }
  };
  container = null;
  zoomImage = null;
  boundingClientRect = {};
  zoomImageBoundingClientRect = {};
  // An array containing the pointer events for each pointer on the element
  eventCache = [];
  previousDistanceBetweenPointers = -1;
  assignRef = ref => {
    this.container = ref;
    this.boundingClientRect = this.container.getBoundingClientRect();
  };
  assignZoomImageRef = ref => {
    this.zoomImage = ref;
    this.zoomImageBoundingClientRect = this.zoomImage.getBoundingClientRect();
  };
  getIndexOfEvent = event => {
    return this.eventCache.findIndex(
      cachedEvent => cachedEvent.pointerId === event.pointerId
    );
  };
  transformCoordinates = zoomingMidPoint => {
    // get midpoint and return the midpoint on larger image
    const leftTouchPosition = zoomingMidPoint.x - this.boundingClientRect.left;
    const topTouchPosition = zoomingMidPoint.y - this.boundingClientRect.top;
    // keep these separate do not assume all images are square
    const imageSizeRatioWidth =
      this.zoomImageBoundingClientRect.width / this.boundingClientRect.width;
    const imageSizeRatioHeight =
      this.zoomImageBoundingClientRect.height / this.boundingClientRect.height;
    // TODO make zoom bound width and height separate
    const maxZoomWidthBound =
      this.boundingClientRect.width - this.zoomImageBoundingClientRect.width;
    const maxZoomHeightBound =
      this.boundingClientRect.height - this.zoomImageBoundingClientRect.height;
    const imageOffsetLeft =
      -(leftTouchPosition * imageSizeRatioWidth) +
      this.boundingClientRect.width / 2;
    const imageOffsetTop =
      -(topTouchPosition * imageSizeRatioHeight) +
      this.boundingClientRect.height / 2;
    this.setState({
      position: {
        left: Math.min(0, Math.max(imageOffsetLeft, maxZoomWidthBound)),
        top: Math.min(0, Math.max(imageOffsetTop, maxZoomHeightBound))
      }
    });
  };
  removeEventFromCache = event => {
    event.persist();
    const index = this.getIndexOfEvent(event);
    this.eventCache.splice(index, 1);
    this.setState({ isZooming: false }); // TODO - remove
  };
  handlePointerDown = event => {
    event.persist();
    this.eventCache.push(event); // TODO - actually make this work appropriately for tablet
    // this.panImage(event);
  };
  handlePointerMove = event => {
    event.persist();
    const indexForThisPointer = this.getIndexOfEvent(event);
    // console.log("pointer is moving " + indexForThisPointer);
    // If the current pointer is already in the cache, update the cached value
    // console.log("updating " + indexForThisPointer);
    this.eventCache[indexForThisPointer] = event;
    // console.log(getPointFromTouch(event, this.container));

    if (this.eventCache.length === 1) {
      console.log("there is only one pointer");
      // TODO - handle panning here
      // this.panImage(event);
      this.setState({ isZooming: true });
      const pointA = getPointFromTouch(this.eventCache[0], this.container);
      this.transformCoordinates(pointA);
    }

    if (this.eventCache.length === 2) {
      console.log("there are two pointers!");
      this.setState({ isZooming: true });
      // console.log(this.eventCache[0].pointerId);
      // console.log(getPointFromTouch(this.eventCache[0], this.container));
      // console.log(this.eventCache[1].pointerId);
      // console.log(getPointFromTouch(this.eventCache[1], this.container));
      // If there are two pointers, calculate the distance between them
      const currentDistanceX = Math.abs(
        this.eventCache[0].clientX - this.eventCache[1].clientX
      );
      const pointA = getPointFromTouch(this.eventCache[0], this.container);
      const pointB = getPointFromTouch(this.eventCache[1], this.container);
      const midPoint = getMidpoint(pointA, pointB);

      if (currentDistanceX > this.previousDistanceBetweenPointers) {
        // console.log("zooming in");
        // increase zoom factor
        // this.setState({ isZooming: true });
      } else {
        // decrease zoom factor
        // this.setState({ isZooming: false });
      }

      this.previousDistanceBetweenPointers = currentDistanceX;
      this.transformCoordinates(midPoint);
    }
  };

  // panImage = event => {
  //   const pointFromTouch = getPointFromTouch(event, this.container);
  //   // console.log(pointFromTouch);
  //   const leftPosition = pointFromTouch.x - this.boundingClientRect.width;
  //   const topPosition = pointFromTouch.y - this.boundingClientRect.height;
  //   const imageSizeRatioWidth =
  //     this.zoomImageBoundingClientRect.width / this.boundingClientRect.width;
  //   const imageSizeRatioHeight =
  //     this.zoomImageBoundingClientRect.height / this.boundingClientRect.height;
  //   // console.log({
  //   //   imageSizeRatioHeight,
  //   //   imageSizeRatioWidth,
  //   //   zoomBoundingClientRectHeight: this.zoomImageBoundingClientRect.height,
  //   //   zoomBoundingClientRectWidth: this.zoomImageBoundingClientRect.width,
  //   //   imageBoundingClientRectHeight: this.boundingClientRect.height,
  //   //   imageBoundingClientRectWidth: this.boundingClientRect.width,
  //   //   left: (leftPosition * imageSizeRatioWidth) / 2,
  //   //   top: (topPosition * imageSizeRatioHeight) / 2
  //   // });
  //   this.setState({
  //     position: {
  //       left: leftPosition * imageSizeRatioWidth,
  //       top: topPosition * imageSizeRatioHeight
  //     }
  //   });
  // };

  render() {
    return (
      <div style={{ display: "flex", flexDirection: "row" }}>
        <div
          ref={this.assignRef}
          className="PinchToZoom"
          onPointerDown={this.handlePointerDown}
          onPointerMove={this.handlePointerMove}
          onPointerUp={this.removeEventFromCache}
          onPointerOut={this.removeEventFromCache}
          onPointerLeave={this.removeEventFromCache}
          style={{
            touchAction: this.state.touchAction,
            position: "relative",
            height: 600, // TODO - we should stop assuming 600x600px image here.
            width: 600,
            overflow: "hidden"
          }}
        >
          <img src={images[600]} alt="Click to zoom" />
          <img
            src={images[1600]}
            alt="Zoomed image"
            ref={this.assignZoomImageRef}
            style={{
              position: "absolute",
              ...this.state.position,
              visibility: this.state.isZooming ? "visible" : "hidden",
              border: "10px solid red",
              width: 1600
            }}
          />
        </div>
        <div style={{ maxWidth: 200 }}>{JSON.stringify(this.state)}</div>
      </div>
    );
  }
}

export default PinchToZoom;
