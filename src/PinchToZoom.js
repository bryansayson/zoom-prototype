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
import { red } from "color-name";
// We always will assume that our images are square (since our image cruncher will have some problems with aspect ratio if we don't)
const images = {
  600: "https://secure.img1-fg.wfcdn.com/im/95036494/resize-h600-w600%5Ecompr-r85/1040/104018557/Vart+Geunuine+Leather+Swivel+34%2522+Lounge+Chair+and+Ottoman.jpg",
  1600: "https://secure.img1-fg.wfcdn.com/im/90094606/resize-h1600-w1600%5Ecompr-r85/1040/104018557/Vart+Geunuine+Leather+Swivel+34%2522+Lounge+Chair+and+Ottoman.jpg"
};

const MIN_ZOOM_FACTOR = 1;
// TODO move this inside state and derive from current zoomed image
const MAX_ZOOM_FACTOR = 2.666;
const MAX_DELTA = MAX_ZOOM_FACTOR - MIN_ZOOM_FACTOR;
// we use this to multiply zoom gestures
const ZOOM_ASSIST_FACTOR = 3;

const getPointFromTouch = (touch, element) => {
  const rect = element.getBoundingClientRect(); // TODO - don't always do this - maybe handle it on resize?
  if (!touch) {
    // console.log(new Error().stack);
    // console.error("no touch");
  }
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
};

const getMidpoint = (pointerA, pointerB) => ({
  x: (pointerA.x + pointerB.x) / 2,
  y: (pointerA.y + pointerB.y) / 2
});

class PinchToZoom extends Component {
  state = {
    touchAction: "none",
    position: {
      top: 0,
      left: 0
    },
    lastFingerPosition: {
      top: 0,
      left: 0
    },
    zoomFactor: MIN_ZOOM_FACTOR,
    maxZoomWidthBound: 0,
    maxZoomHeightBound: 0,
    zoomImageBoundingClientRect: 0,
    currentZoomedImageWidth: 0,
    currentZoomedImageHeight: 0,
    previousDistanceBetweenPointers: 0,
    draggingMidpoint: null
  };
  container = null;
  zoomImage = null;
  boundingClientRect = {};
  zoomImageBoundingClientRect = {};
  activePointers = [];

  setZoomImageBoundingClientRect = () => {
    this.zoomImageBoundingClientRect = this.zoomImage.getBoundingClientRect();
    this.setState({
      zoomImageBoundingClientRect: this.zoomImageBoundingClientRect
    });
  };

  assignRef = ref => {
    this.container = ref;
    this.boundingClientRect = this.container.getBoundingClientRect();
  };

  assignZoomImageRef = ref => {
    this.zoomImage = ref;
    this.setZoomImageBoundingClientRect();
  };

  getIndexOfEvent = event => {
    return this.activePointers.findIndex(
      cachedEvent => cachedEvent.pointerId === event.pointerId
    );
  };

  updateEventIfItExists = event => {
    const indexForThisPointer = this.getIndexOfEvent(event);
    if (indexForThisPointer >= 0) {
      this.activePointers[indexForThisPointer] = {
        current: event,
        pointerId: event.pointerId,
        previous: this.activePointers[indexForThisPointer].current
      };
    }
  };

  getMidpointFromTouch = (event1, event2) => {
    const pointA = getPointFromTouch(event1, this.container);
    const pointB = event2 ? getPointFromTouch(event2, this.container) : null;
    const midPoint = !pointB ? event1 : getMidpoint(pointA, pointB);
    return midPoint;
  };

  handlePointerUp = event => {
    if (event.pointerType === "touch") {
      // if (event.pointerType === "touch" && this.activePointers.length >= 2) {
      this.activePointers.splice(this.getIndexOfEvent(event), 1);
      if (this.activePointers.length < 2) {
        this.setState({ previousDistanceBetweenPointers: 0 });
      }
    }
  };

  handlePointerDown = event => {
    event.persist();

    if (event.pointerType === "mouse") {
      if (!this.activePointers.length) {
        this.activePointers.push({
          current: event,
          previous: null,
          pointerId: event.pointerId
        });
        this.setState({ zoomFactor: MAX_ZOOM_FACTOR });
      } else {
        this.activePointers = [];
        this.setState({ zoomFactor: MIN_ZOOM_FACTOR });
      }
    }

    if (event.pointerType === "touch") {
      this.activePointers.push({
        current: event,
        previous: null,
        pointerId: event.pointerId
      });
      if (this.activePointers.length > 1) {
        const oldPointTimeStamp = this.activePointers[
          this.activePointers.length - 2
        ].current.timeStamp;
        const newPointTimeStamp = event.timeStamp;
        const timeDiff = newPointTimeStamp - oldPointTimeStamp;
        const doubleTapPoint = getPointFromTouch(event, this.container);
        // We have 2 fingers down
        if (this.activePointers.length > 1) {
          // console.log("active touch pointers ", this.activePointers);
          const midPoint = this.getMidpointFromTouch(
            this.activePointers[0].current,
            !!this.activePointers[1] ? this.activePointers[1].current : null
          );
          this.setState({
            zoomFactor: MIN_ZOOM_FACTOR
          });
          this.handleZoomPan({
            zoomingMidPoint: midPoint,
            method: "drag"
          });
        } else {
          // if (timeDiff < 175) {
          //   if (this.state.zoomFactor === MIN_ZOOM_FACTOR) {
          //     this.handleZoomPan({
          //       zoomingMidPoint: doubleTapPoint
          //     });
          //     this.setState({ zoomFactor: MAX_ZOOM_FACTOR });
          //   } else {
          //     this.setState({
          //       zoomFactor: MIN_ZOOM_FACTOR,
          //       previousDistanceBetweenPointers: 0
          //     });
          //   }
          // }
        }
      }
    }
  };

  handleZoomPan = ({
    zoomingMidPoint,
    zoomChangeFactor = 0,
    method = "pan"
  }) => {
    // Two mothods - drag and pan
    const zoomFactor = Math.max(
      Math.min(this.state.zoomFactor + zoomChangeFactor, MAX_ZOOM_FACTOR),
      MIN_ZOOM_FACTOR
    );
    // get midpoint and return the midpoint on larger image
    const leftTouchPosition = zoomingMidPoint.x - this.boundingClientRect.left;
    const topTouchPosition = zoomingMidPoint.y - this.boundingClientRect.top;
    const currentZoomedImageWidth = this.boundingClientRect.width * zoomFactor;
    const currentZoomedImageHeight =
      this.boundingClientRect.height * zoomFactor;
    // keep these separate do not assume all images are square
    const imageSizeRatioWidth =
      currentZoomedImageWidth / this.boundingClientRect.width;
    const imageSizeRatioHeight =
      currentZoomedImageHeight / this.boundingClientRect.height;
    // TODO make zoom bound width and height separate
    // TODO make 1 + zoomChangeFactor a variable
    const maxZoomWidthBound =
      this.boundingClientRect.width - currentZoomedImageWidth;
    const maxZoomHeightBound =
      this.boundingClientRect.height - currentZoomedImageHeight;
    const currentFingerMidpoint =
      method === "drag" &&
      typeof this.activePointers[0] === "object" &&
      this.activePointers[0] !== null &&
      this.activePointers[0].current
        ? this.getMidpointFromTouch(
            typeof this.activePointers[0] !== "undefined"
              ? this.activePointers[0].current
              : null,
            typeof this.activePointers[1] !== "undefined"
              ? this.activePointers[1].current
              : null
          )
        : {};
    const previousFingerMidpoint =
      method === "drag" &&
      typeof this.activePointers[0] === "object" &&
      this.activePointers[0] !== null &&
      this.activePointers[0].previous
        ? this.getMidpointFromTouch(
            !!this.activePointers[0] ? this.activePointers[0].previous : null,
            !!this.activePointers[1] ? this.activePointers[1].previous : null
          )
        : {};
    const imageOffsetLeft = -(method === "drag" && this.state.draggingMidpoint
      ? this.state.draggingMidpoint.x +
        (currentFingerMidpoint.x - previousFingerMidpoint.x)
      : leftTouchPosition * imageSizeRatioWidth);
    const imageOffsetTop = -(method === "drag" && this.state.draggingMidpoint
      ? this.state.draggingMidpoint.y +
        (currentFingerMidpoint.y - previousFingerMidpoint.y)
      : topTouchPosition * imageSizeRatioHeight);
    this.setState(prevState => {
      console.log(currentFingerMidpoint.x - previousFingerMidpoint.x);
      console.log(currentFingerMidpoint.y - previousFingerMidpoint.y);
      return {
        zoomFactor,
        position: {
          left: Math.min(0, Math.max(imageOffsetLeft, maxZoomWidthBound)),
          top: Math.min(0, Math.max(imageOffsetTop, maxZoomHeightBound))
        },
        maxZoomWidthBound,
        maxZoomHeightBound,
        currentZoomedImageWidth,
        currentZoomedImageHeight,
        ...(method === "drag"
          ? {
              draggingMidpoint:
                zoomFactor === 1
                  ? null
                  : prevState.draggingMidpoint === null
                  ? zoomingMidPoint
                  : {
                      x:
                        prevState.draggingMidpoint.x +
                        (currentFingerMidpoint.x - previousFingerMidpoint.x),
                      y:
                        prevState.draggingMidpoint.y +
                        (currentFingerMidpoint.y - previousFingerMidpoint.y)
                    }
            }
          : {})
      };
    });
  };

  handlePointerMove = event => {
    event.persist();
    this.updateEventIfItExists(event);
    if (event.pointerType === "mouse") {
      if (this.activePointers.length) {
        const pointA = getPointFromTouch(
          this.activePointers[0].current,
          this.container
        );
        this.handleZoomPan({ zoomingMidPoint: pointA });
      }
    }
    if (event.pointerType === "touch") {
      if (this.activePointers.length === 1) {
        const pointA = getPointFromTouch(event, this.container);
        this.handleZoomPan({ zoomingMidPoint: pointA, method: "drag" });
      }

      if (this.activePointers.length > 1) {
        const currentDistanceX = Math.abs(
          this.activePointers[0].current.clientX -
            this.activePointers[1].current.clientX
        );
        const currentDistanceY = Math.abs(
          this.activePointers[0].current.clientY -
            this.activePointers[1].current.clientY
        );
        const currentDistance = Math.sqrt(
          Math.pow(currentDistanceX, 2) + Math.pow(currentDistanceY, 2)
        );
        const pointA = getPointFromTouch(
          this.activePointers[0].current,
          this.container
        );
        const pointB = getPointFromTouch(
          this.activePointers[1].current,
          this.container
        );
        const midPoint = getMidpoint(pointA, pointB);
        let zoomChange = 0;

        // previousDistanceBetweenPointers starts at 0 and we only want to do the calculation if it has been set to something other than 0
        if (this.state.previousDistanceBetweenPointers) {
          // check delta change to be a ceratin amount before doing calculation
          const delta =
            currentDistance - this.state.previousDistanceBetweenPointers;
          const zoomRatio =
            (delta / this.boundingClientRect.width) * ZOOM_ASSIST_FACTOR;

          zoomChange = MAX_DELTA * zoomRatio;
        }
        this.setState({ previousDistanceBetweenPointers: currentDistance });
        this.handleZoomPan({
          zoomingMidPoint: midPoint,
          zoomChangeFactor: zoomChange,
          method: "drag"
        });
      }
    }
  };

  componentDidMount() {
    this.setZoomImageBoundingClientRect();
    window.addEventListener("resize", this.setZoomImageBoundingClientRect);
    window.addEventListener(
      "contextmenu",
      function(e) {
        e.preventDefault();
      },
      false
    );
  }

  render() {
    return (
      <React.Fragment>
        <div> Zoom Factor: {this.state.zoomFactor} </div>
        <div>
          {" "}
          Previous Distance: {this.state.previousDistanceBetweenPointers}{" "}
        </div>
        <div>
          {" "}
          Dragging Midpoint: {JSON.stringify(this.state.draggingMidpoint)}
        </div>
        <div> Active Pointers: {this.activePointers.length}</div>
        <div
          ref={this.assignRef}
          className="PinchToZoom"
          onPointerDown={this.handlePointerDown}
          onPointerMove={this.handlePointerMove}
          onPointerUp={this.handlePointerUp}
          style={{
            touchAction: this.state.touchAction,
            position: "relative",
            height: 600, // TODO - we should stop assuming 600x600px image here.
            width: 600,
            overflow: "hidden"
          }}
        >
          {this.state.draggingMidpoint && (
            <div
              style={{
                position: "absolute",
                width: 5,
                height: 5,
                background: "red",
                borderRadius: "50%",
                left: this.state.draggingMidpoint.x,
                top: this.state.draggingMidpoint.y,
                zIndex: 3000
              }}
            />
          )}
          {this.activePointers.map(pointer => {
            <div
              style={{
                position: "absolute",
                width: 200,
                height: 200,
                background: "blue",
                borderRadius: "50%",
                left: getPointFromTouch(pointer.current, this.container).x,
                top: getPointFromTouch(pointer.current, this.container).y,
                zIndex: 3000
              }}
            />;
          })}
          <img src={images[600]} alt="Click to zoom" />
          <img
            src={images[1600]}
            alt="Zoomed image"
            ref={this.assignZoomImageRef}
            style={{
              position: "absolute",
              ...this.state.position,
              visibility:
                this.state.zoomFactor > MIN_ZOOM_FACTOR ? "visible" : "hidden",
              width:
                this.boundingClientRect.width * this.state.zoomFactor || 1600
            }}
          />
        </div>
      </React.Fragment>
    );
  }
}

export default PinchToZoom;

// TODO
// stop relying on zooming state just rely on zoom factor === 1
// fix max zoom factor to be not hard coded
// dragging with one finger should move everything across the screen, look at leftoffset and top offset
// hook zoom into scroll in / out
// CTA button
// look at request animation frame
